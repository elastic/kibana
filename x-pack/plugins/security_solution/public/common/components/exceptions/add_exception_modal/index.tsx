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
  EuiLoadingSpinner,
  EuiCallOut,
  EuiText,
} from '@elastic/eui';
import {
  ExceptionListItemSchema,
  ExceptionListSchema,
  Comment,
} from '../../../../../public/lists_plugin_deps';
import * as i18n from './translations';
import { TimelineNonEcsData, Ecs } from '../../../../graphql/types';
import { useKibana } from '../../../lib/kibana';
import { errorToToaster, displaySuccessToast, useStateToaster } from '../../toasters';
import { useRule } from '../../../../../alerts/containers/detection_engine/rules';
import { ExceptionBuilder } from '../../exception_builder';
import { ExceptionItem } from '../../exception_builder/types';
import { Loader } from '../../loader';
import { useAddOrUpdateException } from '../../../../alerts/containers/detection_engine/alerts/use_add_exception';
import { useFetchOrCreateRuleExceptionList } from '../use_fetch_or_create_rule_exception_list';
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
  ruleId: string;
  ruleExceptionLists?: ExceptionListSchema[];
  exceptionListType: ExceptionListSchema['type'];
  alertData: TimelineNonEcsData[] | undefined;
}

interface AddExceptionModalProps {
  ruleName: string;
  ruleId: string;
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

// TODO: for endpoint exceptions add OS to each entry in the exception items
export const AddExceptionModal = memo(function AddExceptionModal({
  ruleName,
  ruleId,
  exceptionListType,
  alertData,
  onCancel,
  onConfirm,
}: AddExceptionModalProps) {
  const { http } = useKibana().services;
  const [comment, setComment] = useState('');
  const [shouldCloseAlert, setShouldCloseAlert] = useState(false);
  const [exceptionItemsToAdd, setExceptionItemsToAdd] = useState<ExceptionListItemSchema[]>([]);
  const [fetchOrCreateListError, setFetchOrCreateListError] = useState(false);
  const [, dispatchToaster] = useStateToaster();

  const onError = useCallback(
    (error: Error) => {
      errorToToaster({ title: i18n.ADD_EXCEPTION_ERROR, error, dispatchToaster });
      onCancel();
    },
    [dispatchToaster, onCancel]
  );
  const onSuccess = useCallback(() => {
    displaySuccessToast(i18n.ADD_EXCEPTION_SUCCESS, dispatchToaster);
    onConfirm();
  }, [dispatchToaster, onConfirm]);

  const [{ isLoading: addExceptionIsLoading }, addOrUpdateExceptionItems] = useAddOrUpdateException(
    {
      http,
      onSuccess,
      onError,
    }
  );

  useEffect(() => {
    if (alertData !== undefined && exceptionListType === 'endpoint') {
      setExceptionItemsToAdd(defaultEndpointExceptionItems(exceptionListType, ruleId, alertData)); // TODO: ruleId isnt correct here
    }
  }, [alertData, exceptionListType, ruleId, setExceptionItemsToAdd]);

  const onFetchOrCreateExceptionListError = useCallback(
    (error: Error) => {
      setFetchOrCreateListError(true);
    },
    [setFetchOrCreateListError]
  );
  const [isLoadingExceptionList, ruleExceptionList] = useFetchOrCreateRuleExceptionList({
    http,
    ruleId,
    exceptionListType,
    onError: onFetchOrCreateExceptionListError,
  });

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
    let enriched: ExceptionListItemSchema[] = [];
    enriched =
      comment !== ''
        ? enrichExceptionItemsWithComments(exceptionItemsToAdd, [{ comment }])
        : exceptionItemsToAdd;
    if (exceptionListType === 'endpoint') {
      const osTags = alertData ? ['windows'] : ['windows', 'macos', 'linux']; // TODO: use alert data instead
      enriched = enrichExceptionItemsWithOS(enriched, osTags);
    }

    // TODO: delete this. Namespace should be handled by the builder
    return enrichExceptionItemsWithNamespace(
      enriched,
      exceptionListType === 'endpoint' ? 'agnostic' : 'single'
    );
  }, [comment, exceptionItemsToAdd, exceptionListType, alertData]);

  const onAddExceptionConfirm = useCallback(() => {
    console.log(enrichExceptionItems());
    // TODO: Create API hook for persisting and closing
    // TODO: if close checkbox is selected, refresh signals table
    if (addOrUpdateExceptionItems !== null) {
      addOrUpdateExceptionItems(enrichExceptionItems());
    }
  }, [addOrUpdateExceptionItems, enrichExceptionItems]);

  const isSubmitButtonDisabled = useCallback(
    () => fetchOrCreateListError || exceptionItemsToAdd.length === 0,
    [fetchOrCreateListError, exceptionItemsToAdd]
  );

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

        {fetchOrCreateListError === true && (
          <EuiCallOut title={'Error'} color="danger" iconType="alert">
            <p>{i18n.ADD_EXCEPTION_FETCH_ERROR}</p>
          </EuiCallOut>
        )}
        {fetchOrCreateListError === false && isLoadingExceptionList === true && (
          <Loader data-test-subj="loadingAddExceptionModal" size="xl" />
        )}
        {fetchOrCreateListError === false && !isLoadingExceptionList && ruleExceptionList && (
          <>
            <ModalBodySection className="builder-section">
              <ExceptionBuilder
                exceptionItems={exceptionItemsToAdd}
                listId={ruleExceptionList.list_id}
                listType={exceptionListType}
                dataTestSubj="alert-exception-builder"
                idAria="alert-exception-builder"
                onChange={setExceptionItemsToAdd}
              />

              <EuiSpacer />

              {exceptionListType === 'endpoint' && (
                <>
                  <EuiText size="s">{i18n.ENDPOINT_QUARANTINE_TEXT}</EuiText>
                  <EuiSpacer />
                </>
              )}

              <AddExceptionComments
                newCommentValue={comment}
                newCommentOnChange={onCommentChange}
              />
            </ModalBodySection>
            <EuiHorizontalRule />
            {alertData !== undefined && (
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
            )}
          </>
        )}

        <EuiModalFooter>
          <EuiButtonEmpty onClick={onCancel}>{i18n.CANCEL}</EuiButtonEmpty>

          <EuiButton
            onClick={onAddExceptionConfirm}
            isLoading={addExceptionIsLoading}
            isDisabled={isSubmitButtonDisabled()}
            fill
          >
            {i18n.ADD_EXCEPTION}
          </EuiButton>
        </EuiModalFooter>
      </Modal>
    </EuiOverlayMask>
  );
});
