/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint complexity: ["error", 30]*/

import React, { memo, useEffect, useState, useCallback, useMemo } from 'react';
import styled, { css } from 'styled-components';
import {
  EuiFlyout,
  EuiFlyoutHeader,
  EuiTitle,
  EuiFlyoutFooter,
  EuiFlyoutBody,
  EuiButton,
  EuiButtonEmpty,
  EuiHorizontalRule,
  EuiCheckbox,
  EuiSpacer,
  EuiFormRow,
  EuiText,
  EuiCallOut,
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiFlexGroup,
} from '@elastic/eui';
import type {
  ExceptionListType,
  OsTypeArray,
  ExceptionListItemSchema,
  CreateExceptionListItemSchema,
} from '@kbn/securitysolution-io-ts-list-types';
import { ExceptionsBuilderExceptionItem } from '@kbn/securitysolution-list-utils';
import {
  hasEqlSequenceQuery,
  isEqlRule,
  isThresholdRule,
} from '../../../../../common/detection_engine/utils';
import { Status } from '../../../../../common/detection_engine/schemas/common/schemas';
import { getExceptionBuilderComponentLazy } from '../../../../../../lists/public';
import * as i18nCommon from '../../../translations';
import * as i18n from './translations';
import * as sharedI18n from '../translations';
import { useAppToasts } from '../../../hooks/use_app_toasts';
import { useKibana } from '../../../lib/kibana';
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
  retrieveAlertOsTypes,
  filterIndexPatterns,
} from '../helpers';
import { ErrorInfo, ErrorCallout } from '../error_callout';
import { AlertData } from '../types';
import { useFetchIndex } from '../../../containers/source';
import { useGetInstalledJob } from '../../ml/hooks/use_get_jobs';

export interface AddExceptionFlyoutProps {
  ruleName: string;
  ruleId: string;
  exceptionListType: ExceptionListType;
  ruleIndices: string[];
  alertData?: AlertData;
  /**
   * The components that use this may or may not define `alertData`
   * If they do, they need to fetch it async. In that case `alertData` will be
   * undefined while `isAlertDataLoading` will be true. In the case that `alertData`
   *  is not used, `isAlertDataLoading` will be undefined
   */
  isAlertDataLoading?: boolean;
  alertStatus?: Status;
  onCancel: () => void;
  onConfirm: (didCloseAlert: boolean, didBulkCloseAlert: boolean) => void;
  onRuleChange?: () => void;
}

const FlyoutHeader = styled(EuiFlyoutHeader)`
  ${({ theme }) => css`
    border-bottom: 1px solid ${theme.eui.euiColorLightShade};
  `}
`;

const FlyoutSubtitle = styled.div`
  ${({ theme }) => css`
    color: ${theme.eui.euiColorMediumShade};
  `}
`;

const FlyoutBodySection = styled.section`
  ${({ theme }) => css`
    padding: ${theme.eui.euiSizeS} ${theme.eui.euiSizeL};

    &.builder-section {
      overflow-y: scroll;
    }
  `}
`;

const FlyoutCheckboxesSection = styled(EuiFlyoutBody)`
  overflow-y: inherit;
  height: auto;

  .euiFlyoutBody__overflowContent {
    padding-top: 0;
  }
`;

const FlyoutFooterGroup = styled(EuiFlexGroup)`
  ${({ theme }) => css`
    padding: ${theme.eui.euiSizeS};
  `}
`;

export const AddExceptionFlyout = memo(function AddExceptionFlyout({
  ruleName,
  ruleId,
  ruleIndices,
  exceptionListType,
  alertData,
  isAlertDataLoading,
  onCancel,
  onConfirm,
  onRuleChange,
  alertStatus,
}: AddExceptionFlyoutProps) {
  const { http, data } = useKibana().services;
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
  const memoSignalIndexName = useMemo(
    () => (signalIndexName !== null ? [signalIndexName] : []),
    [signalIndexName]
  );
  const [isSignalIndexPatternLoading, { indexPatterns: signalIndexPatterns }] =
    useFetchIndex(memoSignalIndexName);

  const memoMlJobIds = useMemo(() => maybeRule?.machine_learning_job_id ?? [], [maybeRule]);
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
  }, [exceptionListType, ruleExceptionList, ruleName, alertData]);

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

  const hasAlertData = useMemo((): boolean => {
    return alertData !== undefined;
  }, [alertData]);

  const [selectedOs, setSelectedOs] = useState<OsTypeArray | undefined>();

  const osTypesSelection = useMemo((): OsTypeArray => {
    return hasAlertData ? retrieveAlertOsTypes(alertData) : selectedOs ? [...selectedOs] : [];
  }, [hasAlertData, alertData, selectedOs]);

  const enrichExceptionItems = useCallback((): Array<
    ExceptionListItemSchema | CreateExceptionListItemSchema
  > => {
    let enriched: Array<ExceptionListItemSchema | CreateExceptionListItemSchema> = [];
    enriched =
      comment !== ''
        ? enrichNewExceptionItemsWithComments(exceptionItemsToAdd, [{ comment }])
        : exceptionItemsToAdd;
    if (exceptionListType === 'endpoint') {
      const osTypes = osTypesSelection;
      enriched = lowercaseHashValues(enrichExceptionItemsWithOS(enriched, osTypes));
    }
    return enriched;
  }, [comment, exceptionItemsToAdd, exceptionListType, osTypesSelection]);

  const onAddExceptionConfirm = useCallback((): void => {
    if (addOrUpdateExceptionItems != null) {
      const alertIdToClose = shouldCloseAlert && alertData ? alertData._id : undefined;
      const bulkCloseIndex =
        shouldBulkCloseAlert && signalIndexName != null ? [signalIndexName] : undefined;
      addOrUpdateExceptionItems(
        maybeRule?.rule_id ?? '',
        enrichExceptionItems(),
        alertIdToClose,
        bulkCloseIndex
      );
    }
  }, [
    addOrUpdateExceptionItems,
    maybeRule,
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

  const OsOptions: Array<EuiComboBoxOptionOption<OsTypeArray>> = useMemo((): Array<
    EuiComboBoxOptionOption<OsTypeArray>
  > => {
    return [
      {
        label: sharedI18n.OPERATING_SYSTEM_WINDOWS,
        value: ['windows'],
      },
      {
        label: sharedI18n.OPERATING_SYSTEM_MAC,
        value: ['macos'],
      },
      {
        label: sharedI18n.OPERATING_SYSTEM_LINUX,
        value: ['linux'],
      },
      {
        label: sharedI18n.OPERATING_SYSTEM_WINDOWS_AND_MAC,
        value: ['windows', 'macos'],
      },
    ];
  }, []);

  const handleOSSelectionChange = useCallback(
    (selectedOptions): void => {
      setSelectedOs(selectedOptions[0].value);
    },
    [setSelectedOs]
  );

  const selectedOStoOptions = useMemo((): Array<EuiComboBoxOptionOption<OsTypeArray>> => {
    return OsOptions.filter((option) => {
      return selectedOs === option.value;
    });
  }, [selectedOs, OsOptions]);

  const singleSelectionOptions = useMemo(() => {
    return { asPlainText: true };
  }, []);

  const hasOsSelection = useMemo(() => {
    return exceptionListType === 'endpoint' && !hasAlertData;
  }, [exceptionListType, hasAlertData]);

  const isExceptionBuilderFormDisabled = useMemo(() => {
    return hasOsSelection && selectedOs === undefined;
  }, [hasOsSelection, selectedOs]);

  return (
    <EuiFlyout
      ownFocus
      maskProps={{ style: 'z-index: 5000' }} // For an edge case to display above the timeline flyout
      size="l"
      onClose={onCancel}
      data-test-subj="add-exception-flyout"
    >
      <FlyoutHeader>
        <EuiTitle>
          <h2 data-test-subj="exception-flyout-title">{addExceptionMessage}</h2>
        </EuiTitle>
        <EuiSpacer size="xs" />
        <FlyoutSubtitle className="eui-textTruncate" title={ruleName}>
          {ruleName}
        </FlyoutSubtitle>
        <EuiSpacer size="m" />
      </FlyoutHeader>

      {fetchOrCreateListError != null && (
        <EuiFlyoutFooter>
          <ErrorCallout
            http={http}
            errorInfo={fetchOrCreateListError}
            rule={maybeRule}
            onCancel={onCancel}
            onSuccess={handleDissasociationSuccess}
            onError={handleDissasociationError}
            data-test-subj="addExceptionFlyoutErrorCallout"
          />
        </EuiFlyoutFooter>
      )}
      {fetchOrCreateListError == null &&
        (isLoadingExceptionList ||
          isIndexPatternLoading ||
          isSignalIndexLoading ||
          isAlertDataLoading ||
          isSignalIndexPatternLoading) && (
          <Loader data-test-subj="loadingAddExceptionFlyout" size="xl" />
        )}
      {fetchOrCreateListError == null &&
        !isSignalIndexLoading &&
        !isSignalIndexPatternLoading &&
        !isLoadingExceptionList &&
        !isIndexPatternLoading &&
        !isRuleLoading &&
        !mlJobLoading &&
        !isAlertDataLoading &&
        ruleExceptionList && (
          <>
            <FlyoutBodySection className="builder-section">
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
              {exceptionListType === 'endpoint' && !hasAlertData && (
                <>
                  <EuiFormRow label={sharedI18n.OPERATING_SYSTEM_LABEL}>
                    <EuiComboBox
                      placeholder={i18n.OPERATING_SYSTEM_PLACEHOLDER}
                      singleSelection={singleSelectionOptions}
                      options={OsOptions}
                      selectedOptions={selectedOStoOptions}
                      onChange={handleOSSelectionChange}
                      isClearable={false}
                      data-test-subj="os-selection-dropdown"
                    />
                  </EuiFormRow>
                  <EuiSpacer size="l" />
                </>
              )}
              {getExceptionBuilderComponentLazy({
                allowLargeValueLists:
                  !isEqlRule(maybeRule?.type) && !isThresholdRule(maybeRule?.type),
                httpService: http,
                autocompleteService: data.autocomplete,
                exceptionListItems: initialExceptionItems,
                listType: exceptionListType,
                osTypes: osTypesSelection,
                listId: ruleExceptionList.list_id,
                listNamespaceType: ruleExceptionList.namespace_type,
                listTypeSpecificIndexPatternFilter: filterIndexPatterns,
                ruleName,
                indexPatterns,
                isOrDisabled: isExceptionBuilderFormDisabled,
                isAndDisabled: isExceptionBuilderFormDisabled,
                isNestedDisabled: isExceptionBuilderFormDisabled,
                dataTestSubj: 'alert-exception-builder',
                idAria: 'alert-exception-builder',
                onChange: handleBuilderOnChange,
                isDisabled: isExceptionBuilderFormDisabled,
              })}

              <EuiSpacer />

              <AddExceptionComments
                newCommentValue={comment}
                newCommentOnChange={onCommentChange}
              />
            </FlyoutBodySection>
            <EuiHorizontalRule />
            <FlyoutCheckboxesSection>
              {alertData != null && alertStatus !== 'closed' && (
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
                    shouldDisableBulkClose ? i18n.BULK_CLOSE_LABEL_DISABLED : i18n.BULK_CLOSE_LABEL
                  }
                  checked={shouldBulkCloseAlert}
                  onChange={onBulkCloseAlertCheckboxChange}
                  disabled={shouldDisableBulkClose}
                />
              </EuiFormRow>
              {exceptionListType === 'endpoint' && (
                <>
                  <EuiSpacer size="s" />
                  <EuiText data-test-subj="add-exception-endpoint-text" color="subdued" size="s">
                    {i18n.ENDPOINT_QUARANTINE_TEXT}
                  </EuiText>
                </>
              )}
            </FlyoutCheckboxesSection>
          </>
        )}
      {fetchOrCreateListError == null && (
        <EuiFlyoutFooter>
          <FlyoutFooterGroup justifyContent="spaceBetween">
            <EuiButtonEmpty data-test-subj="cancelExceptionAddButton" onClick={onCancel}>
              {i18n.CANCEL}
            </EuiButtonEmpty>

            <EuiButton
              data-test-subj="add-exception-confirm-button"
              onClick={onAddExceptionConfirm}
              isLoading={addExceptionIsLoading}
              isDisabled={isSubmitButtonDisabled}
              fill
            >
              {addExceptionMessage}
            </EuiButton>
          </FlyoutFooterGroup>
        </EuiFlyoutFooter>
      )}
    </EuiFlyout>
  );
});
