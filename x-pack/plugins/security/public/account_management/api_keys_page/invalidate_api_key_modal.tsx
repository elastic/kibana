/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiText } from '@elastic/eui';
import { useKibana } from '../../../../../../src/plugins/kibana_react/public';
import { ApiKeyToInvalidate } from '../../../common/model';
import {
  APIKeysAPIClient,
  InvalidateApiKeysResponse,
} from '../../management/api_keys/api_keys_api_client';
import { useSubmitHandler } from '../components/use_form';
import { ConfirmModal, ConfirmModalProps } from '../components/confirm_modal';

export interface InvalidateApiKeyModalProps {
  onCancel: ConfirmModalProps['onCancel'];
  onSuccess?(result: InvalidateApiKeysResponse): any;
  onError?(error: Error): any;
  apiKey: ApiKeyToInvalidate;
}

export const InvalidateApiKeyModal: FunctionComponent<InvalidateApiKeyModalProps> = ({
  onCancel,
  onSuccess,
  onError,
  apiKey,
}) => {
  const { services, notifications } = useKibana();
  const [state, invalidateApiKeys] = useSubmitHandler(
    {
      onSubmit: () =>
        new APIKeysAPIClient(services.http!).invalidateApiKeys([
          { id: apiKey.id, name: apiKey.name },
        ]),
      onSubmitSuccess: (values) => {
        notifications.toasts.success({
          iconType: 'check',
          title: i18n.translate(
            'xpack.security.accountManagement.invalidateApiKey.successMessage',
            {
              defaultMessage: 'Invalidated API key “{name}”',
              values: { name: apiKey.name },
            }
          ),
          toastLifeTimeMs: 3000,
        });
        onSuccess?.(values);
      },
      onSubmitError: (error) => {
        notifications.toasts.danger({
          iconType: 'alert',
          title: i18n.translate('xpack.security.accountManagement.invalidateApiKey.errorMessage', {
            defaultMessage: 'Could not invalidate API key “{name}”',
            values: { name: apiKey.name },
          }),
          body: (error as any).body?.message || error.message,
          toastLifeTimeMs: 1500,
        });
        onError?.(error);
      },
    },
    [services.http]
  );

  return (
    <ConfirmModal
      title={i18n.translate('xpack.security.accountManagement.invalidateApiKey.title', {
        defaultMessage: 'Invalidate API key “{name}”?',
        values: { name: apiKey.name },
      })}
      confirmButtonColor="danger"
      confirmButtonText={i18n.translate(
        'xpack.security.accountManagement.invalidateApiKey.submitButton',
        {
          defaultMessage:
            '{isSubmitting, select, true{Invalidating API key…} other{I understand, permanently invalidate this key}}',
          values: { isSubmitting: state.isSubmitting },
        }
      )}
      onConfirm={invalidateApiKeys}
      onCancel={onCancel}
      isLoading={state.isSubmitting}
      maxWidth={575}
    >
      <EuiText>
        <p>
          <FormattedMessage
            id="xpack.security.accountManagement.invalidateApiKey.message"
            defaultMessage="Any application using this key will no longer be able to access the stack. You cannot undo this action."
          />
        </p>
      </EuiText>
    </ConfirmModal>
  );
};
