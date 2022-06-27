/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { EuiModal, EuiModalHeader, EuiModalHeaderTitle, EuiModalBody, EuiForm, EuiFormRow, EuiModalFooter, EuiButton, EuiSpacer, EuiButtonEmpty, EuiCallOut, EuiFieldText } from '@elastic/eui';
import { useApi } from '@kbn/securitysolution-list-hooks';
import { CreateExceptionListSchema, ExceptionListSchema, ListArray } from '@kbn/securitysolution-io-ts-list-types';

import * as i18n from './translations';
import { useKibana } from '../../../lib/kibana';
import { patchRule } from '../../../../detections/containers/detection_engine/rules/api';

interface CreateExceptionListComponentProps {
  rule?: Rule;
  showFirstLinkedListCallout: boolean;
  handleCloseModal: () => void;
  handleCreateExceptionListSuccess: (list: ExceptionListSchema) => void;
}

const CreateExceptionListComponent = ({
  rule,
  showFirstLinkedListCallout,
  handleCloseModal,
  handleCreateExceptionListSuccess,
}: CreateExceptionListComponentProps): JSX.Element => {
  const { http, notifications } = useKibana().services;
  const { addExceptionList } = useApi(http);

  const [listName, setListName] = useState(rule != null ? `${rule.name} Exception List` : '');
  const [listDescription, setListDescription] = useState('');

  const onNameChange = useCallback((e) => {
    setListName(e.target.value);
  }, [setListName]);

  const onDescriptionChange = useCallback((e) => {
    setListDescription(e.target.value);
  }, [setListDescription]);

  const handleListCreationSuccess = useCallback(
    (listId: string) => () => {
      notifications.toasts.addSuccess({
        title: i18n.exceptionListCreateSuccessMessage(listId),
      });
    },
    [notifications.toasts]
  );

  const handleListCreationError = useCallback(
    (err: Error & { body?: { message: string } }): void => {
      notifications.toasts.addError(err, {
        title: i18n.EXCEPTION_LIST_CREATE_TOAST_ERROR,
      });
    },
    [notifications.toasts]
  );

  const onCreateListSubmit = useCallback(async () => {
    const exceptionListToCreate: CreateExceptionListSchema = {
      name: listName,
      description: listDescription ?? '',
      type: 'detection',
      namespace_type: 'single',
      list_id: undefined,
      tags: undefined,
      meta: undefined,
    };

    try {
      const newExceptionList = await addExceptionList({
        list: exceptionListToCreate,
      });

      if (rule != null) {
        const abortCtrl = new AbortController();
        const newExceptionListReferences: ListArray = [
          ...(rule.exceptions_list ?? []),
          newExceptionList,
        ];
        console.log(newExceptionListReferences)
        await patchRule({
          ruleProperties: {
            rule_id: rule.rule_id,
            exceptions_list: newExceptionListReferences,
          },
          signal: abortCtrl.signal,
        });
      }

      handleListCreationSuccess(newExceptionList.list_id);
      handleCreateExceptionListSuccess(newExceptionList);
    } catch (e) {
      console.log({e})
      handleListCreationError(e);
    }

  }, [handleListCreationError, addExceptionList, listName, listDescription]);

  return (
    <EuiModal onClose={handleCloseModal} initialFocus="[name=exceptionListName]">
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          <h1>{i18n.CREATE_EXCEPTION_LIST_MODAL_TITLE}</h1>
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        {showFirstLinkedListCallout && (
          <>
            <EuiCallOut
              title={i18n.FIRST_LINKED_LIST_CALLOUT_TITLE}
              iconType="magnifyWithExclamation">
              <p>{i18n.FIRST_LINKED_LIST_CALLOUT_BODY}</p>
            </EuiCallOut>
            <EuiSpacer size='m' />
          </>
        )}
        <EuiForm id="createExceptionListForm" component="form">
          <EuiFormRow label={i18n.EXCEPTION_LIST_NAME_LABEL}>
            <EuiFieldText
              name="exceptionListName" 
              placeholder={i18n.EXCEPTION_LIST_NAME_PLACEHOLDER}
              value={listName}
              onChange={onNameChange}
            />
          </EuiFormRow>
          <EuiFormRow label={i18n.EXCEPTION_LIST_DESCRIPTION_LABEL}>
            <EuiFieldText
              name="exceptionListDescription" 
              placeholder={i18n.EXCEPTION_LIST_DESCRIPTION_PLACEHOLDER}
              value={listDescription}
              onChange={onDescriptionChange}
            />
          </EuiFormRow>
        </EuiForm>
      </EuiModalBody>

      <EuiModalFooter>
        <EuiButtonEmpty onClick={handleCloseModal}>Cancel</EuiButtonEmpty>

        <EuiButton isDisabled={listName.trim() === ''} type="submit" form="createExceptionListForm" onClick={onCreateListSubmit} fill>
          {i18n.CREATE_EXCEPTION_LIST_BUTTON}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};

CreateExceptionListComponent.displayName = 'CreateExceptionListComponent';

export const CreateExceptionList = React.memo(CreateExceptionListComponent);

CreateExceptionList.displayName = 'CreateExceptionList';