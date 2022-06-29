/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { EuiModal, EuiModalHeader, EuiModalHeaderTitle, EuiModalBody, EuiForm, EuiFormRow, EuiModalFooter, EuiButton, EuiSpacer, EuiButtonEmpty, EuiCallOut, EuiFieldText } from '@elastic/eui';
import { CreateExceptionListSchema, ExceptionListSchema } from '@kbn/securitysolution-io-ts-list-types';

import * as i18n from './translations';
import { useCreateAndAssociateExceptionList } from './use_create_and_associate_exception_list';

interface CreateExceptionListComponentProps {
  rule: Rule;
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
  const [listName, setListName] = useState(rule != null ? `${rule.name} Exception List` : '');
  const [listDescription, setListDescription] = useState('');
  const [isSavingExceptionList, createAndAssociateList] = useCreateAndAssociateExceptionList();

  const onNameChange = useCallback((e) => {
    setListName(e.target.value);
  }, [setListName]);

  const onDescriptionChange = useCallback((e) => {
    setListDescription(e.target.value);
  }, [setListDescription]);

  const createAndAssociateExceptionList = useCallback(async () => {
    if (createAndAssociateList != null) {
      const exceptionListToCreate: CreateExceptionListSchema = {
        name: listName,
        description: listDescription ?? '',
        type: 'detection',
        namespace_type: 'single',
        list_id: undefined,
        tags: undefined,
        meta: undefined,
      };
  
      const newExceptionList = await createAndAssociateList(
        exceptionListToCreate,
        [{id: rule.id, ruleId: rule.rule_id}]
      );
  
      handleCreateExceptionListSuccess(newExceptionList);
    }
  }, [rule, listName, listDescription]);

  const onCreateListSubmit = useCallback(() => {
    createAndAssociateExceptionList();
  }, [createAndAssociateExceptionList]);


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

        <EuiButton
          isDisabled={listName.trim() === ''}
          onClick={onCreateListSubmit}
          isLoading={isSavingExceptionList || createAndAssociateList == null}
          fill
        >
          {i18n.CREATE_EXCEPTION_LIST_BUTTON}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};

CreateExceptionListComponent.displayName = 'CreateExceptionListComponent';

export const CreateExceptionList = React.memo(CreateExceptionListComponent);

CreateExceptionList.displayName = 'CreateExceptionList';