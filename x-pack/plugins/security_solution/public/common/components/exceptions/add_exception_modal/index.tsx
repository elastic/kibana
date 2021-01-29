/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint complexity: ["error", 30]*/

import React, { memo, useEffect, useState, useCallback, useMemo } from 'react';
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
import { Status } from '../../../../../common/detection_engine/schemas/common/schemas';
import {
  ExceptionListItemSchema,
  CreateExceptionListItemSchema,
  ExceptionListType,
} from '../../../../../public/lists_plugin_deps';
import * as i18nCommon from '../../../translations';
import * as i18n from './translations';
import * as sharedI18n from '../translations';
import { Ecs } from '../../../../../common/ecs';
import { osTypeArray, OsTypeArray } from '../../../../../common/shared_imports';
import { useAppToasts } from '../../../hooks/use_app_toasts';
import { useKibana } from '../../../lib/kibana';
import { ExceptionBuilderComponent } from '../builder';
import { Loader } from '../../loader';
import { useAddOrUpdateException } from '../use_add_exception';
import { useSignalIndex } from '../../../../detections/containers/detection_engine/alerts/use_signal_index';
import { useRuleAsync } from '../../../../detections/containers/detection_engine/rules/use_rule_async';
import { useFetchOrCreateRuleExceptionList } from '../use_fetch_or_create_rule_exception_list';
import { AddExceptionComments } from '../add_exception_comments';
import {
  enrichNewExceptionItemsWithComments,
  enrichExceptionItemsWithOS,
  lowercaseHashValues,
  defaultEndpointExceptionItems,
  entryHasListType,
  entryHasNonEcsType,
} from '../helpers';
import { ErrorInfo, ErrorCallout } from '../error_callout';
import { ExceptionsBuilderExceptionItem } from '../types';
import { useFetchIndex } from '../../../containers/source';
import { useGetInstalledJob } from '../../ml/hooks/use_get_jobs';

export interface AddExceptionModalProps {
  ruleName: string;
  ruleId: string;
  exceptionListType: ExceptionListType;
  ruleIndices: string[];
  alertData?: Ecs;
  alertStatus?: Status;
  onCancel: () => void;
  onConfirm: (didCloseAlert: boolean, didBulkCloseAlert: boolean) => void;
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

export const AddExceptionModal = memo(function AddExceptionModal({
  ruleName,
  ruleId,
  ruleIndices,
  exceptionListType,
  alertData,
  onCancel,
  onConfirm,
  onRuleChange,
  alertStatus,
}: AddExceptionModalProps) {
  const { http } = useKibana().services;
  const [errorsExist, setErrorExists] = useState(false);
  const [comment, setComment] = useState('');
  const { rule: maybeRule, loading: isRuleLoading } = useRuleAsync(ruleId);
  const [shouldCloseAlert, setShouldCloseAlert] = useState(false);
  const [shouldBulkCloseAlert, setShouldBulkCloseAlert] = useState(false);
  const [shouldDisableBulkClose, setShouldDisableBulkClose] = useState(false);
  const [exceptionItemsToAdd, setExceptionItemsToAdd] = useState<
    Array<ExceptionListItemSchema | CreateExceptionListItemSchema>
  >([]);
  const [fetchOrCreateListError, setFetchOrCreateListError] = useState<ErrorInfo | null>(null);
  const { addError, addSuccess, addWarning } = useAppToasts();
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
  const onError = useCallback(
    (error: Error): void => {
      addError(error, { title: i18n.ADD_EXCEPTION_ERROR });
      onCancel();
    },
    [addError, onCancel]
  );

  const onSuccess = useCallback(
    (updated: number, conflicts: number): void => {
      addSuccess(i18n.ADD_EXCEPTION_SUCCESS);
      onConfirm(shouldCloseAlert, shouldBulkCloseAlert);
      if (conflicts > 0) {
        addWarning({
          title: i18nCommon.UPDATE_ALERT_STATUS_FAILED(conflicts),
          text: i18nCommon.UPDATE_ALERT_STATUS_FAILED_DETAILED(updated, conflicts),
        });
      }
    },
    [addSuccess, addWarning, onConfirm, shouldBulkCloseAlert, shouldCloseAlert]
  );

  const [{ isLoading: addExceptionIsLoading }, addOrUpdateExceptionItems] = useAddOrUpdateException(
    {
      http,
      onSuccess,
      onError,
    }
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

  const handleRuleChange = useCallback(
    (ruleChanged: boolean): void => {
      if (ruleChanged && onRuleChange) {
        onRuleChange();
      }
    },
    [onRuleChange]
  );

  const handleDissasociationSuccess = useCallback(
    (id: string): void => {
      handleRuleChange(true);
      addSuccess(sharedI18n.DISSASOCIATE_LIST_SUCCESS(id));
      onCancel();
    },
    [handleRuleChange, addSuccess, onCancel]
  );

  const handleDissasociationError = useCallback(
    (error: Error): void => {
      addError(error, { title: sharedI18n.DISSASOCIATE_EXCEPTION_LIST_ERROR });
      onCancel();
    },
    [addError, onCancel]
  );

  const handleFetchOrCreateExceptionListError = useCallback(
    (error: Error, statusCode: number | null, message: string | null): void => {
      setFetchOrCreateListError({
        reason: error.message,
        code: statusCode,
        details: message,
        listListId: null,
      });
    },
    [setFetchOrCreateListError]
  );

  const [isLoadingExceptionList, ruleExceptionList] = useFetchOrCreateRuleExceptionList({
    http,
    ruleId,
    exceptionListType,
    onError: handleFetchOrCreateExceptionListError,
    onSuccess: handleRuleChange,
  });

  const initialExceptionItems = useMemo((): ExceptionsBuilderExceptionItem[] => {
    if (exceptionListType === 'endpoint' && alertData != null && ruleExceptionList) {
      return defaultEndpointExceptionItems(ruleExceptionList.list_id, ruleName, alertData);
    } else {
      return [];
    }
  }, [alertData, exceptionListType, ruleExceptionList, ruleName]);

  useEffect((): void => {
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

  useEffect((): void => {
    if (shouldDisableBulkClose === true) {
      setShouldBulkCloseAlert(false);
    }
  }, [shouldDisableBulkClose]);

  const onCommentChange = useCallback(
    (value: string): void => {
      setComment(value);
    },
    [setComment]
  );

  const onCloseAlertCheckboxChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>): void => {
      setShouldCloseAlert(event.currentTarget.checked);
    },
    [setShouldCloseAlert]
  );

  const onBulkCloseAlertCheckboxChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>): void => {
      setShouldBulkCloseAlert(event.currentTarget.checked);
    },
    [setShouldBulkCloseAlert]
  );

  const retrieveAlertOsTypes = useCallback((): OsTypeArray => {
    const osDefaults: OsTypeArray = ['windows', 'macos'];
    if (alertData != null) {
      const osTypes = alertData.host && alertData.host.os && alertData.host.os.family;
      if (osTypeArray.is(osTypes) && osTypes != null && osTypes.length > 0) {
        return osTypes;
      }
      return osDefaults;
    }
    return osDefaults;
  }, [alertData]);

  const enrichExceptionItems = useCallback((): Array<
    ExceptionListItemSchema | CreateExceptionListItemSchema
  > => {
    let enriched: Array<ExceptionListItemSchema | CreateExceptionListItemSchema> = [];
    enriched =
      comment !== ''
        ? enrichNewExceptionItemsWithComments(exceptionItemsToAdd, [{ comment }])
        : exceptionItemsToAdd;
    if (exceptionListType === 'endpoint') {
      const osTypes = retrieveAlertOsTypes();
      enriched = lowercaseHashValues(enrichExceptionItemsWithOS(enriched, osTypes));
    }
    return enriched;
  }, [comment, exceptionItemsToAdd, exceptionListType, retrieveAlertOsTypes]);

  const onAddExceptionConfirm = useCallback((): void => {
    if (addOrUpdateExceptionItems != null) {
      const alertIdToClose = shouldCloseAlert && alertData ? alertData._id : undefined;
      const bulkCloseIndex =
        shouldBulkCloseAlert && signalIndexName != null ? [signalIndexName] : undefined;
      addOrUpdateExceptionItems(ruleId, enrichExceptionItems(), alertIdToClose, bulkCloseIndex);
    }
  }, [
    addOrUpdateExceptionItems,
    ruleId,
    enrichExceptionItems,
    shouldCloseAlert,
    shouldBulkCloseAlert,
    alertData,
    signalIndexName,
  ]);

  const isSubmitButtonDisabled = useMemo(
    (): boolean =>
      fetchOrCreateListError != null ||
      exceptionItemsToAdd.every((item) => item.entries.length === 0) ||
      errorsExist,
    [fetchOrCreateListError, exceptionItemsToAdd, errorsExist]
  );

  const addExceptionMessage =
    exceptionListType === 'endpoint' ? i18n.ADD_ENDPOINT_EXCEPTION : i18n.ADD_EXCEPTION;

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
          <EuiModalHeaderTitle>{addExceptionMessage}</EuiModalHeaderTitle>
          <ModalHeaderSubtitle className="eui-textTruncate" title={ruleName}>
            {ruleName}
          </ModalHeaderSubtitle>
        </ModalHeader>

        {fetchOrCreateListError != null && (
          <EuiModalFooter>
            <ErrorCallout
              http={http}
              errorInfo={fetchOrCreateListError}
              rule={maybeRule}
              onCancel={onCancel}
              onSuccess={handleDissasociationSuccess}
              onError={handleDissasociationError}
              data-test-subj="addExceptionModalErrorCallout"
            />
          </EuiModalFooter>
        )}
        {fetchOrCreateListError == null &&
          (isLoadingExceptionList ||
            isIndexPatternLoading ||
            isSignalIndexLoading ||
            isSignalIndexPatternLoading) && (
            <Loader data-test-subj="loadingAddExceptionModal" size="xl" />
          )}
        {fetchOrCreateListError == null &&
          !isSignalIndexLoading &&
          !isSignalIndexPatternLoading &&
          !isLoadingExceptionList &&
          !isIndexPatternLoading &&
          !isRuleLoading &&
          !mlJobLoading &&
          ruleExceptionList && (
            <>
              <ModalBodySection className="builder-section">
                {isRuleEQLSequenceStatement && (
                  <>
                    <EuiCallOut
                      data-test-subj="eql-sequence-callout"
                      title={i18n.ADD_EXCEPTION_SEQUENCE_WARNING}
                    />
                    <EuiSpacer />
                  </>
                )}
                <EuiText>{i18n.EXCEPTION_BUILDER_INFO}</EuiText>
                <EuiSpacer />
                <ExceptionBuilderComponent
                  exceptionListItems={initialExceptionItems}
                  listType={exceptionListType}
                  listId={ruleExceptionList.list_id}
                  listNamespaceType={ruleExceptionList.namespace_type}
                  ruleName={ruleName}
                  indexPatterns={indexPatterns}
                  isOrDisabled={false}
                  isAndDisabled={false}
                  isNestedDisabled={false}
                  data-test-subj="alert-exception-builder"
                  id-aria="alert-exception-builder"
                  onChange={handleBuilderOnChange}
                  ruleType={maybeRule?.type}
                />

                <EuiSpacer />

                <AddExceptionComments
                  newCommentValue={comment}
                  newCommentOnChange={onCommentChange}
                />
              </ModalBodySection>
              <EuiHorizontalRule />
              <ModalBodySection>
                {alertData !== undefined && alertStatus !== 'closed' && (
                  <EuiFormRow fullWidth>
                    <EuiCheckbox
                      data-test-subj="close-alert-on-add-add-exception-checkbox"
                      id="close-alert-on-add-add-exception-checkbox"
                      label="Close this alert"
                      checked={shouldCloseAlert}
                      onChange={onCloseAlertCheckboxChange}
                    />
                  </EuiFormRow>
                )}
                <EuiFormRow fullWidth>
                  <EuiCheckbox
                    data-test-subj="bulk-close-alert-on-add-add-exception-checkbox"
                    id="bulk-close-alert-on-add-add-exception-checkbox"
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
                    <EuiText data-test-subj="add-exception-endpoint-text" color="subdued" size="s">
                      {i18n.ENDPOINT_QUARANTINE_TEXT}
                    </EuiText>
                  </>
                )}
              </ModalBodySection>
            </>
          )}
        {fetchOrCreateListError == null && (
          <EuiModalFooter>
            <EuiButtonEmpty onClick={onCancel}>{i18n.CANCEL}</EuiButtonEmpty>

            <EuiButton
              data-test-subj="add-exception-confirm-button"
              onClick={onAddExceptionConfirm}
              isLoading={addExceptionIsLoading}
              isDisabled={isSubmitButtonDisabled}
              fill
            >
              {addExceptionMessage}
            </EuiButton>
          </EuiModalFooter>
        )}
      </Modal>
    </EuiOverlayMask>
  );
});
