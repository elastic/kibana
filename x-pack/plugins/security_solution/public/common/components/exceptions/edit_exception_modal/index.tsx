/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo, useState, useCallback, useEffect, useMemo } from 'react';
import styled, { css } from 'styled-components';
import {
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalFooter,
  EuiOverlayMask,
  EuiButton,
  EuiButtonEmpty,
  EuiHorizontalRule,
  EuiCheckbox,
  EuiSpacer,
  EuiFormRow,
  EuiText,
  EuiCallOut,
} from '@elastic/eui';

import { hasEqlSequenceQuery, isEqlRule } from '../../../../../common/detection_engine/utils';
import { useFetchIndex } from '../../../containers/source';
import { useSignalIndex } from '../../../../detections/containers/detection_engine/alerts/use_signal_index';
import { useRuleAsync } from '../../../../detections/containers/detection_engine/rules/use_rule_async';
import {
  ExceptionListItemSchema,
  CreateExceptionListItemSchema,
  ExceptionListType,
} from '../../../../../public/lists_plugin_deps';
import * as i18n from './translations';
import * as sharedI18n from '../translations';
import { useKibana } from '../../../lib/kibana';
import { useAppToasts } from '../../../hooks/use_app_toasts';
import { ExceptionBuilderComponent } from '../builder';
import { useAddOrUpdateException } from '../use_add_exception';
import { AddExceptionComments } from '../add_exception_comments';
import {
  enrichExistingExceptionItemWithComments,
  enrichExceptionItemsWithOS,
  entryHasListType,
  entryHasNonEcsType,
  lowercaseHashValues,
} from '../helpers';
import { Loader } from '../../loader';
import { ErrorInfo, ErrorCallout } from '../error_callout';
import { useGetInstalledJob } from '../../ml/hooks/use_get_jobs';

interface EditExceptionModalProps {
  ruleName: string;
  ruleId: string;
  ruleIndices: string[];
  exceptionItem: ExceptionListItemSchema;
  exceptionListType: ExceptionListType;
  onCancel: () => void;
  onConfirm: () => void;
  onRuleChange?: () => void;
}

const Modal = styled(EuiModal)`
  ${({ theme }) => css`
    width: ${theme.eui.euiBreakpoints.l};
    max-width: ${theme.eui.euiBreakpoints.l};
  `}
`;

const ModalHeader = styled(EuiModalHeader)`
  flex-direction: column;
  align-items: flex-start;
`;

const ModalHeaderSubtitle = styled.div`
  ${({ theme }) => css`
    color: ${theme.eui.euiColorMediumShade};
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

export const EditExceptionModal = memo(function EditExceptionModal({
  ruleName,
  ruleId,
  ruleIndices,
  exceptionItem,
  exceptionListType,
  onCancel,
  onConfirm,
  onRuleChange,
}: EditExceptionModalProps) {
  const { http } = useKibana().services;
  const [comment, setComment] = useState('');
  const [errorsExist, setErrorExists] = useState(false);
  const { rule: maybeRule, loading: isRuleLoading } = useRuleAsync(ruleId);
  const [updateError, setUpdateError] = useState<ErrorInfo | null>(null);
  const [hasVersionConflict, setHasVersionConflict] = useState(false);
  const [shouldBulkCloseAlert, setShouldBulkCloseAlert] = useState(false);
  const [shouldDisableBulkClose, setShouldDisableBulkClose] = useState(false);
  const [exceptionItemsToAdd, setExceptionItemsToAdd] = useState<
    Array<ExceptionListItemSchema | CreateExceptionListItemSchema>
  >([]);
  const { addError, addSuccess } = useAppToasts();
  const { loading: isSignalIndexLoading, signalIndexName } = useSignalIndex();
  const memoSignalIndexName = useMemo(() => (signalIndexName !== null ? [signalIndexName] : []), [
    signalIndexName,
  ]);
  const [isSignalIndexPatternLoading, { indexPatterns: signalIndexPatterns }] = useFetchIndex(
    memoSignalIndexName
  );

  const memoMlJobIds = useMemo(
    () => (maybeRule?.machine_learning_job_id != null ? [maybeRule.machine_learning_job_id] : []),
    [maybeRule]
  );
  const { loading: mlJobLoading, jobs } = useGetInstalledJob(memoMlJobIds);

  const memoRuleIndices = useMemo(() => {
    if (jobs.length > 0) {
      return jobs[0].results_index_name ? [`.ml-anomalies-${jobs[0].results_index_name}`] : [];
    } else {
      return ruleIndices;
    }
  }, [jobs, ruleIndices]);

  const [isIndexPatternLoading, { indexPatterns }] = useFetchIndex(memoRuleIndices);

  const handleExceptionUpdateError = useCallback(
    (error: Error, statusCode: number | null, message: string | null) => {
      if (error.message.includes('Conflict')) {
        setHasVersionConflict(true);
      } else {
        setUpdateError({
          reason: error.message,
          code: statusCode,
          details: message,
          listListId: exceptionItem.list_id,
        });
      }
    },
    [setUpdateError, setHasVersionConflict, exceptionItem.list_id]
  );

  const handleDissasociationSuccess = useCallback(
    (id: string): void => {
      addSuccess(sharedI18n.DISSASOCIATE_LIST_SUCCESS(id));

      if (onRuleChange) {
        onRuleChange();
      }

      onCancel();
    },
    [addSuccess, onCancel, onRuleChange]
  );

  const handleDissasociationError = useCallback(
    (error: Error): void => {
      addError(error, { title: sharedI18n.DISSASOCIATE_EXCEPTION_LIST_ERROR });
      onCancel();
    },
    [addError, onCancel]
  );

  const handleExceptionUpdateSuccess = useCallback((): void => {
    addSuccess(i18n.EDIT_EXCEPTION_SUCCESS);
    onConfirm();
  }, [addSuccess, onConfirm]);

  const [{ isLoading: addExceptionIsLoading }, addOrUpdateExceptionItems] = useAddOrUpdateException(
    {
      http,
      onSuccess: handleExceptionUpdateSuccess,
      onError: handleExceptionUpdateError,
    }
  );

  useEffect(() => {
    if (isSignalIndexPatternLoading === false && isSignalIndexLoading === false) {
      setShouldDisableBulkClose(
        entryHasListType(exceptionItemsToAdd) ||
          entryHasNonEcsType(exceptionItemsToAdd, signalIndexPatterns) ||
          exceptionItemsToAdd.every((item) => item.entries.length === 0)
      );
    }
  }, [
    setShouldDisableBulkClose,
    exceptionItemsToAdd,
    isSignalIndexPatternLoading,
    isSignalIndexLoading,
    signalIndexPatterns,
  ]);

  useEffect(() => {
    if (shouldDisableBulkClose === true) {
      setShouldBulkCloseAlert(false);
    }
  }, [shouldDisableBulkClose]);

  const isSubmitButtonDisabled = useMemo(
    () =>
      exceptionItemsToAdd.every((item) => item.entries.length === 0) ||
      hasVersionConflict ||
      errorsExist,
    [exceptionItemsToAdd, hasVersionConflict, errorsExist]
  );

  const handleBuilderOnChange = useCallback(
    ({
      exceptionItems,
      errorExists,
    }: {
      exceptionItems: Array<ExceptionListItemSchema | CreateExceptionListItemSchema>;
      errorExists: boolean;
    }) => {
      setExceptionItemsToAdd(exceptionItems);
      setErrorExists(errorExists);
    },
    [setExceptionItemsToAdd]
  );

  const onCommentChange = useCallback(
    (value: string) => {
      setComment(value);
    },
    [setComment]
  );

  const onBulkCloseAlertCheckboxChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setShouldBulkCloseAlert(event.currentTarget.checked);
    },
    [setShouldBulkCloseAlert]
  );

  const enrichExceptionItems = useCallback(() => {
    const [exceptionItemToEdit] = exceptionItemsToAdd;
    let enriched: Array<ExceptionListItemSchema | CreateExceptionListItemSchema> = [
      {
        ...enrichExistingExceptionItemWithComments(exceptionItemToEdit, [
          ...exceptionItem.comments,
          ...(comment.trim() !== '' ? [{ comment }] : []),
        ]),
      },
    ];
    if (exceptionListType === 'endpoint') {
      enriched = lowercaseHashValues(enrichExceptionItemsWithOS(enriched, exceptionItem.os_types));
    }
    return enriched;
  }, [exceptionItemsToAdd, exceptionItem, comment, exceptionListType]);

  const onEditExceptionConfirm = useCallback(() => {
    if (addOrUpdateExceptionItems !== null) {
      const bulkCloseIndex =
        shouldBulkCloseAlert && signalIndexName !== null ? [signalIndexName] : undefined;
      addOrUpdateExceptionItems(ruleId, enrichExceptionItems(), undefined, bulkCloseIndex);
    }
  }, [
    addOrUpdateExceptionItems,
    ruleId,
    enrichExceptionItems,
    shouldBulkCloseAlert,
    signalIndexName,
  ]);

  const isRuleEQLSequenceStatement = useMemo((): boolean => {
    if (maybeRule != null) {
      return isEqlRule(maybeRule.type) && hasEqlSequenceQuery(maybeRule.query);
    }
    return false;
  }, [maybeRule]);

  return (
    <EuiOverlayMask onClick={onCancel}>
      <Modal onClose={onCancel} data-test-subj="add-exception-modal">
        <ModalHeader>
          <EuiModalHeaderTitle>
            {exceptionListType === 'endpoint'
              ? i18n.EDIT_ENDPOINT_EXCEPTION_TITLE
              : i18n.EDIT_EXCEPTION_TITLE}
          </EuiModalHeaderTitle>
          <ModalHeaderSubtitle className="eui-textTruncate" title={ruleName}>
            {ruleName}
          </ModalHeaderSubtitle>
        </ModalHeader>
        {(addExceptionIsLoading || isIndexPatternLoading || isSignalIndexLoading) && (
          <Loader data-test-subj="loadingEditExceptionModal" size="xl" />
        )}
        {!isSignalIndexLoading &&
          !addExceptionIsLoading &&
          !isIndexPatternLoading &&
          !isRuleLoading &&
          !mlJobLoading && (
            <>
              <ModalBodySection className="builder-section">
                {isRuleEQLSequenceStatement && (
                  <>
                    <EuiCallOut
                      data-test-subj="eql-sequence-callout"
                      title={i18n.EDIT_EXCEPTION_SEQUENCE_WARNING}
                    />
                    <EuiSpacer />
                  </>
                )}
                <EuiText>{i18n.EXCEPTION_BUILDER_INFO}</EuiText>
                <EuiSpacer />
                <ExceptionBuilderComponent
                  exceptionListItems={[exceptionItem]}
                  listType={exceptionListType}
                  listId={exceptionItem.list_id}
                  listNamespaceType={exceptionItem.namespace_type}
                  ruleName={ruleName}
                  isOrDisabled
                  isAndDisabled={false}
                  isNestedDisabled={false}
                  data-test-subj="edit-exception-modal-builder"
                  id-aria="edit-exception-modal-builder"
                  onChange={handleBuilderOnChange}
                  indexPatterns={indexPatterns}
                  ruleType={maybeRule?.type}
                />

                <EuiSpacer />

                <AddExceptionComments
                  exceptionItemComments={exceptionItem.comments}
                  newCommentValue={comment}
                  newCommentOnChange={onCommentChange}
                />
              </ModalBodySection>
              <EuiHorizontalRule />
              <ModalBodySection>
                <EuiFormRow fullWidth>
                  <EuiCheckbox
                    data-test-subj="close-alert-on-add-edit-exception-checkbox"
                    id="close-alert-on-add-edit-exception-checkbox"
                    label={
                      shouldDisableBulkClose
                        ? i18n.BULK_CLOSE_LABEL_DISABLED
                        : i18n.BULK_CLOSE_LABEL
                    }
                    checked={shouldBulkCloseAlert}
                    onChange={onBulkCloseAlertCheckboxChange}
                    disabled={shouldDisableBulkClose}
                  />
                </EuiFormRow>
                {exceptionListType === 'endpoint' && (
                  <>
                    <EuiSpacer />
                    <EuiText data-test-subj="edit-exception-endpoint-text" color="subdued" size="s">
                      {i18n.ENDPOINT_QUARANTINE_TEXT}
                    </EuiText>
                  </>
                )}
              </ModalBodySection>
            </>
          )}
        {updateError != null && (
          <ModalBodySection>
            <ErrorCallout
              http={http}
              errorInfo={updateError}
              rule={maybeRule}
              onCancel={onCancel}
              onSuccess={handleDissasociationSuccess}
              onError={handleDissasociationError}
            />
          </ModalBodySection>
        )}
        {hasVersionConflict && (
          <ModalBodySection>
            <EuiCallOut title={i18n.VERSION_CONFLICT_ERROR_TITLE} color="danger" iconType="alert">
              <p>{i18n.VERSION_CONFLICT_ERROR_DESCRIPTION}</p>
            </EuiCallOut>
          </ModalBodySection>
        )}
        {updateError == null && (
          <EuiModalFooter>
            <EuiButtonEmpty onClick={onCancel}>{i18n.CANCEL}</EuiButtonEmpty>

            <EuiButton
              data-test-subj="edit-exception-confirm-button"
              onClick={onEditExceptionConfirm}
              isLoading={addExceptionIsLoading}
              isDisabled={isSubmitButtonDisabled}
              fill
            >
              {i18n.EDIT_EXCEPTION_SAVE_BUTTON}
            </EuiButton>
          </EuiModalFooter>
        )}
      </Modal>
    </EuiOverlayMask>
  );
});
