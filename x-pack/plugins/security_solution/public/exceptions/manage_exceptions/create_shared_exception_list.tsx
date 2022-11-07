/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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

import { useCreateSharedExceptionListWithOptionalSignal } from './use_create_shared_list';
import {
  CREATE_SHARED_LIST_TITLE,
  CREATE_SHARED_LIST_NAME_FIELD,
  CREATE_SHARED_LIST_DESCRIPTION,
  CREATE_BUTTON,
  CLOSE_FLYOUT,
  CREATE_SHARED_LIST_DESCRIPTION_PLACEHOLDER,
  CREATE_SHARED_LIST_NAME_FIELD_PLACEHOLDER,
} from './translations';

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
    const [listName, setListName] = useState('');
    const [description, setDescription] = useState('');

    const { start: createSharedExceptionList, ...createSharedExceptionListState } =
      useCreateSharedExceptionListWithOptionalSignal();
    const ctrl = useRef(new AbortController());

    const onListNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setListName(e.target.value);
    };
    const onDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setDescription(e.target.value);
    };

    const hanadleCreateSharedExceptionList = useCallback(() => {
      if (!createSharedExceptionListState.loading && listName !== '') {
        ctrl.current = new AbortController();

        createSharedExceptionList({
          http,
          signal: ctrl.current.signal,
          name: listName,
          description,
        });
      }
    }, [
      createSharedExceptionList,
      createSharedExceptionListState.loading,
      description,
      http,
      listName,
    ]);

    const handleCreateSuccess = useCallback(
      (response) => {
        addSuccess({
          text: translate.translate(
            'xpack.securitySolution.exceptions.createSharedExceptionListSuccessDescription',
            {
              defaultMessage: 'list with name ${listName} was created!',
              values: { listName },
            }
          ),
          title: translate.translate(
            'xpack.securitySolution.exceptions.createSharedExceptionListSuccessTitle',
            {
              defaultMessage: 'created list',
            }
          ),
        });
        handleRefresh();

        handleCloseFlyout();
      },
      [addSuccess, handleCloseFlyout, handleRefresh, listName]
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
            value={listName}
            onChange={(e) => onListNameChange(e)}
            aria-label="Use aria labels when no actual label is in use"
          />
          <EuiSpacer />
          <EuiText>{CREATE_SHARED_LIST_DESCRIPTION}</EuiText>
          <EuiTextArea
            placeholder={CREATE_SHARED_LIST_DESCRIPTION_PLACEHOLDER}
            value={description}
            onChange={(e) => onDescriptionChange(e)}
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
                onClick={hanadleCreateSharedExceptionList}
                disabled={listName === ''}
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
