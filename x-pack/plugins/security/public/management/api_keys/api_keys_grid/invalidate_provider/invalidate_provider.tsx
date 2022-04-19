/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiConfirmModal } from '@elastic/eui';
import React, { Fragment, useRef, useState } from 'react';

import type { NotificationsStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import type { PublicMethodsOf } from '@kbn/utility-types';

import type { ApiKeyToInvalidate } from '../../../../../common/model';
import type { APIKeysAPIClient } from '../../api_keys_api_client';

interface Props {
  isAdmin: boolean;
  children: (invalidateApiKeys: InvalidateApiKeys) => React.ReactElement;
  notifications: NotificationsStart;
  apiKeysAPIClient: PublicMethodsOf<APIKeysAPIClient>;
}

export type InvalidateApiKeys = (
  apiKeys: ApiKeyToInvalidate[],
  onSuccess?: OnSuccessCallback
) => void;

type OnSuccessCallback = (apiKeysInvalidated: ApiKeyToInvalidate[]) => void;

export const InvalidateProvider: React.FunctionComponent<Props> = ({
  isAdmin,
  children,
  notifications,
  apiKeysAPIClient,
}) => {
  const [apiKeys, setApiKeys] = useState<ApiKeyToInvalidate[]>([]);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const onSuccessCallback = useRef<OnSuccessCallback | null>(null);

  const invalidateApiKeyPrompt: InvalidateApiKeys = (keys, onSuccess = () => undefined) => {
    if (!keys || !keys.length) {
      throw new Error('No API key IDs specified for deletion');
    }
    setIsModalOpen(true);
    setApiKeys(keys);
    onSuccessCallback.current = onSuccess;
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setApiKeys([]);
  };

  const invalidateApiKey = async () => {
    let result;
    let error;
    let errors;

    try {
      result = await apiKeysAPIClient.invalidateApiKeys(apiKeys, isAdmin);
    } catch (e) {
      error = e;
    }

    closeModal();

    if (result) {
      const { itemsInvalidated } = result;
      ({ errors } = result);

      // Surface success notifications
      if (itemsInvalidated && itemsInvalidated.length) {
        const hasMultipleSuccesses = itemsInvalidated.length > 1;
        const successMessage = hasMultipleSuccesses
          ? i18n.translate(
              'xpack.security.management.apiKeys.deleteApiKey.successMultipleNotificationTitle',
              {
                defaultMessage: 'Deleted {count} API keys',
                values: { count: itemsInvalidated.length },
              }
            )
          : i18n.translate(
              'xpack.security.management.apiKeys.deleteApiKey.successSingleNotificationTitle',
              {
                defaultMessage: "Deleted API key '{name}'",
                values: { name: itemsInvalidated[0].name },
              }
            );
        notifications.toasts.addSuccess(successMessage);
        if (onSuccessCallback.current) {
          onSuccessCallback.current([...itemsInvalidated]);
        }
      }
    }

    // Surface error notifications
    // `error` is generic server error
    // `errors` are specific errors with removing particular API keys
    if (error || (errors && errors.length)) {
      const hasMultipleErrors = (errors && errors.length > 1) || (error && apiKeys.length > 1);
      const errorMessage = hasMultipleErrors
        ? i18n.translate(
            'xpack.security.management.apiKeys.deleteApiKey.errorMultipleNotificationTitle',
            {
              defaultMessage: 'Error deleting {count} apiKeys',
              values: {
                count: (errors && errors.length) || apiKeys.length,
              },
            }
          )
        : i18n.translate(
            'xpack.security.management.apiKeys.deleteApiKey.errorSingleNotificationTitle',
            {
              defaultMessage: "Error deleting API key '{name}'",
              values: { name: (errors && errors[0].name) || apiKeys[0].name },
            }
          );
      notifications.toasts.addDanger(errorMessage);
    }
  };

  const renderModal = () => {
    if (!isModalOpen) {
      return null;
    }

    const isSingle = apiKeys.length === 1;

    return (
      <EuiConfirmModal
        role="dialog"
        title={
          isSingle
            ? i18n.translate(
                'xpack.security.management.apiKeys.deleteApiKey.confirmModal.deleteSingleTitle',
                {
                  defaultMessage: "Delete API key '{name}'?",
                  values: { name: apiKeys[0].name },
                }
              )
            : i18n.translate(
                'xpack.security.management.apiKeys.deleteApiKey.confirmModal.deleteMultipleTitle',
                {
                  defaultMessage: 'Delete {count} API keys?',
                  values: { count: apiKeys.length },
                }
              )
        }
        onCancel={closeModal}
        onConfirm={invalidateApiKey}
        cancelButtonText={i18n.translate(
          'xpack.security.management.apiKeys.deleteApiKey.confirmModal.cancelButtonLabel',
          { defaultMessage: 'Cancel' }
        )}
        confirmButtonText={i18n.translate(
          'xpack.security.management.apiKeys.deleteApiKey.confirmModal.confirmButtonLabel',
          {
            defaultMessage: 'Delete {count, plural, one {API key} other {API keys}}',
            values: { count: apiKeys.length },
          }
        )}
        buttonColor="danger"
        data-test-subj="invalidateApiKeyConfirmationModal"
      >
        {!isSingle ? (
          <Fragment>
            <p>
              {i18n.translate(
                'xpack.security.management.apiKeys.deleteApiKey.confirmModal.deleteMultipleListDescription',
                { defaultMessage: 'You are about to delete these API keys:' }
              )}
            </p>
            <ul>
              {apiKeys.map(({ name, id }) => (
                <li key={id}>{name}</li>
              ))}
            </ul>
          </Fragment>
        ) : null}
      </EuiConfirmModal>
    );
  };

  return (
    <Fragment>
      {children(invalidateApiKeyPrompt)}
      {renderModal()}
    </Fragment>
  );
};
