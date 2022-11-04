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

import { useCreateSharedExceptionListWithOptionalSignal } from './use_create_shared_list';

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
          text: `list with name ${listName} was created!`,
          title: `created list`,
        });
        handleRefresh();

        handleCloseFlyout();
      },
      [addSuccess, handleCloseFlyout, handleRefresh, listName]
    );

    const handleCreateError = useCallback(
      (error) => {
        if (!error.message.includes('AbortError') && !error?.body?.message.includes('AbortError')) {
          addError(error, { title: 'creation error' });
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
        <EuiFlyoutHeader>
          <EuiTitle size="m">
            <h2 data-test-subj="createSharedExceptionListTitle">{'hello world!'}</h2>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <EuiText>{'Shared exception list name'}</EuiText>
          <EuiFieldText
            placeholder="New exception list"
            value={listName}
            onChange={(e) => onListNameChange(e)}
            aria-label="Use aria labels when no actual label is in use"
          />
          <EuiSpacer />
          <EuiText>{'Description (optional)'}</EuiText>
          <EuiTextArea
            placeholder="New exception list"
            value={description}
            onChange={(e) => onDescriptionChange(e)}
            aria-label="Stop the hackers"
          />
        </EuiFlyoutBody>
        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty iconType="cross" onClick={handleCloseFlyout} flush="left">
                {'Close'}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                data-test-subj="exception-lists-form-create-shared"
                onClick={hanadleCreateSharedExceptionList}
                disabled={listName === ''}
              >
                {'Create shared exception list'}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </EuiFlyout>
    );
  }
);

CreateSharedListFlyout.displayName = 'CreateSharedListFlyout';
