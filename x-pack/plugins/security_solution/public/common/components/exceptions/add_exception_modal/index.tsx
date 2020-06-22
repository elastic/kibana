/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo, useEffect, useState, useCallback, useMemo } from 'react';
import styled, { css } from 'styled-components';
import {
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalFooter,
  EuiModalBody,
  EuiOverlayMask,
  EuiButton,
  EuiButtonEmpty,
  EuiHorizontalRule,
  EuiCheckbox,
  EuiSpacer,
  EuiFormRow,
} from '@elastic/eui';
import {
  ExceptionListItemSchema,
  ExceptionListSchema,
  Comment,
  useApi,
} from '../../../../../public/lists_plugin_deps';
import * as i18n from './translations';
import { TimelineNonEcsData, Ecs } from '../../../../graphql/types';
import { useKibana } from '../../../lib/kibana';
import { errorToToaster, displaySuccessToast, useStateToaster } from '../../toasters';
import { ExceptionBuilder } from '../../exception_builder';
import { ExceptionItem } from '../../exception_builder/types';
import { useAddException } from '../../../../alerts/containers/detection_engine/alerts/use_add_exception';
import { AddExceptionComments } from '../add_exception_comments';
import {
  enrichExceptionItemsWithComments,
  enrichExceptionItemsWithOS,
  enrichExceptionItemsWithNamespace,
  defaultEndpointExceptionItems,
} from '../helpers';

// TODO: move somewhere else?
// TODO: rename?
export interface AddExceptionOnClick {
  ruleName: string;
  ruleExceptionLists: ExceptionListSchema[];
  exceptionListType: ExceptionListSchema['type'];
  alertData: TimelineNonEcsData[] | null;
}

// TODO: What's the different between ECS data and Non ECS data
interface AddExceptionModalProps {
  ruleName: string;
  ruleExceptionLists: ExceptionListSchema[];
  exceptionListType: ExceptionListSchema['type'];
  alertData?: TimelineNonEcsData[];
  onCancel: () => void;
  onConfirm: () => void;
}

const Modal = styled(EuiModal)`
  ${({ theme }) => css`
    width: ${theme.eui.euiBreakpoints.m};
  `}
`;

// TODO: truncate subtitle
const ModalHeader = styled(EuiModalHeader)`
  ${({ theme }) => css`
    flex-direction: column;
    align-items: flex-start;
  `}
`;

const ModalBodySection = styled.section`
  ${({ theme }) => css`
    padding: ${theme.eui.euiSizeS} ${theme.eui.euiSizeL};

    &.builder-section {
      overflow-y: scroll;
    }
  `}
`;

// TODO: add comment to exception items
// TODO: for endpoint exceptions add OS to each entry in the exception items
export const AddExceptionModal = memo(function AddExceptionModal({
  ruleName,
  ruleExceptionLists,
  exceptionListType,
  alertData,
  onCancel,
  onConfirm,
}: AddExceptionModalProps) {
  const { http } = useKibana().services;
  const [comment, setComment] = useState('');
  const [shouldCloseAlert, setShouldCloseAlert] = useState(false);
  const [exceptionItemsToAdd, setExceptionItemsToAdd] = useState<ExceptionItem[]>([]);
  const [exceptionList, setExceptionList] = useState<ExceptionListSchema | null>(null);
  const [createListError, setCreateListError] = useState(false);
  const [, dispatchToaster] = useStateToaster();
  const { addExceptionList } = useApi(http);
  const onError = useCallback(
    (error) => {
      errorToToaster({ title: i18n.ADD_EXCEPTION_ERROR, error, dispatchToaster });
      onCancel();
    },
    [dispatchToaster, onCancel]
  );
  const onSuccess = useCallback(() => {
    displaySuccessToast(i18n.ADD_EXCEPTION_SUCCESS, dispatchToaster);
    onConfirm();
  }, [dispatchToaster, onConfirm]);

  const [{ isLoading: addExceptionIsLoading }, addExceptionItems] = useAddException({
    onSuccess,
    onError,
    http,
  });

  useEffect(() => {
    const listOfDesiredType = ruleExceptionLists.find((list: ExceptionListSchema) => {
      return list.type === exceptionListType;
    });
    if (listOfDesiredType !== undefined) {
      setExceptionList(listOfDesiredType);
    } else {
      // Create new exception list
      // TODO: associate it with the rule
      // TODO: descrition shouldn't be required by create schema
      // TODO: name shouldn't be required by create schema
      const newExceptionList = {
        description: 'test description',
        name: 'test exception list',
        type: exceptionListType,
        namespace_type: exceptionListType === 'endpoint' ? 'agnostic' : 'single',
      };
      addExceptionList({
        list: newExceptionList,
        onSuccess: (list: ExceptionListSchema) => {
          // TODO: set isLoading, add spinner
          setExceptionList(list);
        },
        onError: () => {
          setCreateListError(true);
        },
      });
    }
  }, [
    ruleExceptionLists,
    exceptionListType,
    addExceptionList,
    setExceptionList,
    setCreateListError,
  ]);

  const onCommentChange = useCallback(
    (value: string) => {
      setComment(value);
    },
    [setComment]
  );

  const onCloseAlertCheckboxChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setShouldCloseAlert(event.currentTarget.checked);
    },
    [setShouldCloseAlert]
  );

  const enrichExceptionItems = useCallback(() => {
    let enriched = [];
    // TODO: only add new comment if it's not empty
    enriched = enrichExceptionItemsWithComments(exceptionItemsToAdd, [{ comment }]);
    if (exceptionListType === 'endpoint') {
      // TODO: dont hardcode 'windows'
      enriched = enrichExceptionItemsWithOS(enriched, 'windows');
    }

    // TODO: delete this. Namespace should be handled by the builder
    return enrichExceptionItemsWithNamespace(
      enriched,
      exceptionListType === 'endpoint' ? 'agnostic' : 'single'
    );
  }, [exceptionItemsToAdd, exceptionListType, comment]);

  const onAddExceptionConfirm = useCallback(() => {
    console.log(enrichExceptionItems());
    // TODO: Create API hook for persisting and closing
    addExceptionItems(enrichExceptionItems());
    // TODO: if close checkbox is selected, refresh signals table
  }, [addExceptionItems, enrichExceptionItems]);

  // TODO: builder - dynamically set listType
  // TODO: set default exception items in builder if type is endpoint and alert data is passed in
  return (
    <EuiOverlayMask>
      <Modal onClose={onCancel} data-test-subj="add-exception-modal">
        <ModalHeader>
          <EuiModalHeaderTitle>{i18n.ADD_EXCEPTION}</EuiModalHeaderTitle>
          <div className="eui-textTruncate" title={ruleName}>
            {ruleName}
          </div>
        </ModalHeader>

        {exceptionList && createListError === false && (
          <>
            <ModalBodySection className="builder-section">
              <ExceptionBuilder
                exceptionItems={[]}
                listId={exceptionList.list_id}
                listType={exceptionListType}
                dataTestSubj="alert-exception-builder"
                idAria="alert-exception-builder"
                onChange={setExceptionItemsToAdd}
              />

              <EuiSpacer />

              <AddExceptionComments
                newCommentValue={comment}
                newCommentOnChange={onCommentChange}
              />
            </ModalBodySection>
            <EuiHorizontalRule />
            <ModalBodySection>
              <EuiFormRow>
                <EuiCheckbox
                  id="close-alert-on-add-add-exception-checkbox"
                  label="Close this alert"
                  checked={shouldCloseAlert}
                  onChange={onCloseAlertCheckboxChange}
                />
              </EuiFormRow>
            </ModalBodySection>
          </>
        )}

        <EuiModalFooter>
          <EuiButtonEmpty onClick={onCancel}>{i18n.CANCEL}</EuiButtonEmpty>

          <EuiButton onClick={onAddExceptionConfirm} isLoading={addExceptionIsLoading} fill>
            {i18n.ADD_EXCEPTION}
          </EuiButton>
        </EuiModalFooter>
      </Modal>
    </EuiOverlayMask>
  );
});
