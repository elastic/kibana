/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChangeEvent } from 'react';
import React, { memo, useState, useCallback, useRef, useEffect } from 'react';
import {
  EuiFlyout,
  EuiTitle,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiText,
  EuiFieldText,
  EuiSpacer,
  EuiTextArea,
  EuiFlyoutFooter,
  EuiFlexGroup,
  EuiButtonEmpty,
  EuiButton,
  EuiFlexItem,
} from '@elastic/eui';
import type { HttpSetup } from '@kbn/core-http-browser';
import type { ErrorToastOptions, Toast, ToastInput } from '@kbn/core-notifications-browser';
import { i18n as translate } from '@kbn/i18n';
import type { ListDetails } from '@kbn/securitysolution-exception-list-components';

import { useCreateSharedExceptionListWithOptionalSignal } from '../../hooks/use_create_shared_list';
import {
  CREATE_SHARED_LIST_TITLE,
  CREATE_SHARED_LIST_NAME_FIELD,
  CREATE_SHARED_LIST_DESCRIPTION,
  CREATE_BUTTON,
  CLOSE_FLYOUT,
  CREATE_SHARED_LIST_DESCRIPTION_PLACEHOLDER,
  CREATE_SHARED_LIST_NAME_FIELD_PLACEHOLDER,
  SUCCESS_TITLE,
  getSuccessText,
} from '../../translations';

export const CreateSharedListFlyout = memo(
  ({
    handleRefresh,
    http,
    handleCloseFlyout,
    addSuccess,
    addError,
  }: {
    handleRefresh: () => void;
    http: HttpSetup;
    addSuccess: (toastOrTitle: ToastInput, options?: unknown) => Toast;
    addError: (error: unknown, options: ErrorToastOptions) => Toast;
    handleCloseFlyout: () => void;
  }) => {
    const { start: createSharedExceptionList, ...createSharedExceptionListState } =
      useCreateSharedExceptionListWithOptionalSignal();
    const ctrl = useRef(new AbortController());

    enum DetailProperty {
      name = 'name',
      description = 'description',
    }

    const [newListDetails, setNewListDetails] = useState<ListDetails>({
      name: '',
      description: '',
    });
    const onChange = (
      { target }: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
      detailProperty: DetailProperty.name | DetailProperty.description
    ) => {
      const { value } = target;
      setNewListDetails({ ...newListDetails, [detailProperty]: value });
    };

    const handleCreateSharedExceptionList = useCallback(() => {
      if (!createSharedExceptionListState.loading && newListDetails.name !== '') {
        ctrl.current = new AbortController();

        createSharedExceptionList({
          http,
          signal: ctrl.current.signal,
          name: newListDetails.name,
          description: newListDetails.description ?? '',
        });
      }
    }, [createSharedExceptionList, createSharedExceptionListState.loading, newListDetails, http]);

    const handleCreateSuccess = useCallback(
      (response) => {
        addSuccess({
          text: getSuccessText(newListDetails.name),
          title: SUCCESS_TITLE,
        });
        handleRefresh();

        handleCloseFlyout();
      },
      [addSuccess, handleCloseFlyout, handleRefresh, newListDetails]
    );

    const handleCreateError = useCallback(
      (error) => {
        if (!error.message.includes('AbortError') && !error?.body?.message.includes('AbortError')) {
          addError(error, {
            title: translate.translate(
              'xpack.securitySolution.exceptions.createSharedExceptionListErrorTitle',
              {
                defaultMessage: 'creation error',
              }
            ),
          });
        }
      },
      [addError]
    );

    useEffect(() => {
      if (!createSharedExceptionListState.loading) {
        if (createSharedExceptionListState?.result) {
          handleCreateSuccess(createSharedExceptionListState.result);
        } else if (createSharedExceptionListState?.error) {
          handleCreateError(createSharedExceptionListState?.error);
        }
      }
    }, [
      createSharedExceptionListState?.error,
      createSharedExceptionListState.loading,
      createSharedExceptionListState.result,
      handleCreateError,
      handleCreateSuccess,
    ]);

    return (
      <EuiFlyout
        ownFocus
        size="s"
        onClose={handleCloseFlyout}
        data-test-subj="createSharedExceptionListFlyout"
      >
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="m">
            <h2 data-test-subj="createSharedExceptionListTitle">{CREATE_SHARED_LIST_TITLE}</h2>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <EuiText>{CREATE_SHARED_LIST_NAME_FIELD}</EuiText>
          <EuiFieldText
            placeholder={CREATE_SHARED_LIST_NAME_FIELD_PLACEHOLDER}
            value={newListDetails.name}
            onChange={(e) => onChange(e, DetailProperty.name)}
            aria-label="Use aria labels when no actual label is in use"
          />
          <EuiSpacer />
          <EuiText>{CREATE_SHARED_LIST_DESCRIPTION}</EuiText>
          <EuiTextArea
            placeholder={CREATE_SHARED_LIST_DESCRIPTION_PLACEHOLDER}
            value={newListDetails.description}
            onChange={(e) => onChange(e, DetailProperty.description)}
            aria-label="Stop the hackers"
          />
        </EuiFlyoutBody>
        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty iconType="cross" onClick={handleCloseFlyout} flush="left">
                {CLOSE_FLYOUT}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                data-test-subj="exception-lists-form-create-shared"
                onClick={handleCreateSharedExceptionList}
                disabled={newListDetails.name === ''}
              >
                {CREATE_BUTTON}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </EuiFlyout>
    );
  }
);

CreateSharedListFlyout.displayName = 'CreateSharedListFlyout';
