/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Component being re-implemented in 8.5

/* eslint complexity: ["error", 35]*/

import React, { memo, useEffect, useState, useCallback, useMemo } from 'react';
import styled, { css } from 'styled-components';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
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
  EuiFlexGroup,
} from '@elastic/eui';
import type {
  CreateExceptionListItemSchema,
  ExceptionListItemSchema,
  ExceptionListType,
  OsTypeArray,
} from '@kbn/securitysolution-io-ts-list-types';
import type {
  ExceptionsBuilderExceptionItem,
  ExceptionsBuilderReturnExceptionItem,
} from '@kbn/securitysolution-list-utils';
import { getExceptionBuilderComponentLazy } from '@kbn/lists-plugin/public';
import type { DataViewBase } from '@kbn/es-query';
import { useRuleIndices } from '../../../rule_management/logic/use_rule_indices';
import { hasEqlSequenceQuery, isEqlRule } from '../../../../../common/detection_engine/utils';
import type { Status } from '../../../../../common/detection_engine/schemas/common/schemas';
import * as i18nCommon from '../../../../common/translations';
import * as i18n from './translations';
import * as sharedI18n from '../../utils/translations';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { useKibana } from '../../../../common/lib/kibana';
import { Loader } from '../../../../common/components/loader';
import { useAddOrUpdateException } from '../../logic/use_add_exception';
import { useSignalIndex } from '../../../../detections/containers/detection_engine/alerts/use_signal_index';
import { useFetchOrCreateRuleExceptionList } from '../../logic/use_fetch_or_create_rule_exception_list';
import { ExceptionItemComments } from '../item_comments';
import {
  enrichNewExceptionItemsWithComments,
  enrichExceptionItemsWithOS,
  lowercaseHashValues,
  defaultEndpointExceptionItems,
  entryHasListType,
  entryHasNonEcsType,
  retrieveAlertOsTypes,
  filterIndexPatterns,
} from '../../utils/helpers';
import type { ErrorInfo } from '../error_callout';
import { ErrorCallout } from '../error_callout';
import type { AlertData } from '../../utils/types';
import { useFetchIndex } from '../../../../common/containers/source';
import { ruleTypesThatAllowLargeValueLists } from '../../utils/constants';
import { useRule } from '../../../rule_management/logic/use_rule';

export interface AddExceptionFlyoutProps {
  ruleName: string;
  ruleId: string;
  exceptionListType: ExceptionListType;
  ruleIndices: string[];
  dataViewId?: string;
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
  dataViewId,
  exceptionListType,
  alertData,
  isAlertDataLoading,
  onCancel,
  onConfirm,
  onRuleChange,
  alertStatus,
}: AddExceptionFlyoutProps) {
  const { http, unifiedSearch, data } = useKibana().services;
  const [errorsExist, setErrorExists] = useState(false);
  const [comment, setComment] = useState('');
  const { data: maybeRule, isLoading: isRuleLoading } = useRule(ruleId);
  const [shouldCloseAlert, setShouldCloseAlert] = useState(false);
  const [shouldBulkCloseAlert, setShouldBulkCloseAlert] = useState(false);
  const [shouldDisableBulkClose, setShouldDisableBulkClose] = useState(false);
  const [exceptionItemsToAdd, setExceptionItemsToAdd] = useState<
    ExceptionsBuilderReturnExceptionItem[]
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

  const { mlJobLoading, ruleIndices: memoRuleIndices } = useRuleIndices(
    maybeRule?.machine_learning_job_id,
    ruleIndices
  );
  const hasDataViewId = dataViewId || maybeRule?.data_view_id || null;
  const [dataViewIndexPatterns, setDataViewIndexPatterns] = useState<DataViewBase | null>(null);

  useEffect(() => {
    const fetchSingleDataView = async () => {
      if (hasDataViewId) {
        const dv = await data.dataViews.get(hasDataViewId);
        setDataViewIndexPatterns(dv);
      }
    };

    fetchSingleDataView();
  }, [hasDataViewId, data.dataViews, setDataViewIndexPatterns]);

  const [isIndexPatternLoading, { indexPatterns: indexIndexPatterns }] = useFetchIndex(
    hasDataViewId ? [] : memoRuleIndices
  );

  const indexPattern = useMemo(
    (): DataViewBase | null => (hasDataViewId ? dataViewIndexPatterns : indexIndexPatterns),
    [hasDataViewId, dataViewIndexPatterns, indexIndexPatterns]
  );

  const handleBuilderOnChange = useCallback(
    ({
      exceptionItems,
      errorExists,
    }: {
      exceptionItems: ExceptionsBuilderReturnExceptionItem[];
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
      addSuccess(sharedI18n.DISASSOCIATE_LIST_SUCCESS(id));
      onCancel();
    },
    [handleRuleChange, addSuccess, onCancel]
  );

  const handleDissasociationError = useCallback(
    (error: Error): void => {
      addError(error, { title: sharedI18n.DISASSOCIATE_EXCEPTION_LIST_ERROR });
      onCancel();
    },
    [addError, onCancel]
  );

  const onError = useCallback(
    (error: Error): void => {
      addError(error, { title: i18n.ADD_EXCEPTION_ERROR });
      onCancel();
    },
    [addError, onCancel]
  );

  const onSuccess = useCallback(
    (updated: number, conflicts: number): void => {
      handleRuleChange(true);
      addSuccess(i18n.ADD_EXCEPTION_SUCCESS);
      onConfirm(shouldCloseAlert, shouldBulkCloseAlert);
      if (conflicts > 0) {
        addWarning({
          title: i18nCommon.UPDATE_ALERT_STATUS_FAILED(conflicts),
          text: i18nCommon.UPDATE_ALERT_STATUS_FAILED_DETAILED(updated, conflicts),
        });
      }
    },
    [addSuccess, addWarning, onConfirm, shouldBulkCloseAlert, shouldCloseAlert, handleRuleChange]
  );

  const [{ isLoading: addExceptionIsLoading }, addOrUpdateExceptionItems] = useAddOrUpdateException(
    {
      http,
      onSuccess,
      onError,
    }
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

  const enrichExceptionItems = useCallback((): ExceptionsBuilderReturnExceptionItem[] => {
    let enriched: ExceptionsBuilderReturnExceptionItem[] = [];
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
        // This is being rewritten in https://github.com/elastic/kibana/pull/140643
        // As of now, flyout cannot yet create item of type CreateRuleExceptionListItemSchema
        enrichExceptionItems() as Array<ExceptionListItemSchema | CreateExceptionListItemSchema>,
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

  const allowLargeValueLists = useMemo(
    () => (maybeRule != null ? ruleTypesThatAllowLargeValueLists.includes(maybeRule.type) : false),
    [maybeRule]
  );

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
            rule={maybeRule ?? null}
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
        indexPattern != null &&
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
                allowLargeValueLists,
                httpService: http,
                autocompleteService: unifiedSearch.autocomplete,
                exceptionListItems: initialExceptionItems,
                listType: exceptionListType,
                osTypes: osTypesSelection,
                listId: ruleExceptionList.list_id,
                listNamespaceType: ruleExceptionList.namespace_type,
                listTypeSpecificIndexPatternFilter: filterIndexPatterns,
                ruleName,
                indexPatterns: indexPattern,
                isOrDisabled: isExceptionBuilderFormDisabled,
                isAndDisabled: isExceptionBuilderFormDisabled,
                isNestedDisabled: isExceptionBuilderFormDisabled,
                dataTestSubj: 'alert-exception-builder',
                idAria: 'alert-exception-builder',
                onChange: handleBuilderOnChange,
                isDisabled: isExceptionBuilderFormDisabled,
              })}

              <EuiSpacer />

              <ExceptionItemComments
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
