/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Component being re-implemented in 8.5

/* eslint-disable complexity */

import React, { memo, useState, useCallback, useEffect, useMemo } from 'react';
import styled, { css } from 'styled-components';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiHorizontalRule,
  EuiCheckbox,
  EuiSpacer,
  EuiFormRow,
  EuiText,
  EuiCallOut,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiFlexGroup,
  EuiTitle,
  EuiFlyout,
  EuiFlyoutFooter,
} from '@elastic/eui';

import type {
  ExceptionListType,
  OsTypeArray,
  OsType,
  ExceptionListItemSchema,
  CreateExceptionListItemSchema,
} from '@kbn/securitysolution-io-ts-list-types';
import { getExceptionBuilderComponentLazy } from '@kbn/lists-plugin/public';
import type { DataViewBase } from '@kbn/es-query';

import type { ExceptionsBuilderReturnExceptionItem } from '@kbn/securitysolution-list-utils';
import { useRuleIndices } from '../../../rule_management/logic/use_rule_indices';
import { hasEqlSequenceQuery, isEqlRule } from '../../../../../common/detection_engine/utils';
import { useFetchIndex } from '../../../../common/containers/source';
import { useSignalIndex } from '../../../../detections/containers/detection_engine/alerts/use_signal_index';

import * as i18n from './translations';
import * as sharedI18n from '../../utils/translations';
import { useKibana } from '../../../../common/lib/kibana';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { useAddOrUpdateException } from '../../logic/use_add_exception';
import { ExceptionItemComments } from '../item_comments';
import {
  enrichExistingExceptionItemWithComments,
  enrichExceptionItemsWithOS,
  entryHasListType,
  entryHasNonEcsType,
  lowercaseHashValues,
  filterIndexPatterns,
} from '../../utils/helpers';
import { Loader } from '../../../../common/components/loader';
import type { ErrorInfo } from '../error_callout';
import { ErrorCallout } from '../error_callout';
import { ruleTypesThatAllowLargeValueLists } from '../../utils/constants';
import { useRule } from '../../../rule_management/logic/use_rule';

interface EditExceptionFlyoutProps {
  ruleName: string;
  ruleId: string;
  ruleIndices: string[];
  dataViewId?: string;
  exceptionItem: ExceptionListItemSchema;
  exceptionListType: ExceptionListType;
  onCancel: () => void;
  onConfirm: () => void;
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
  `}
`;

const FlyoutCheckboxesSection = styled.section`
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

export const EditExceptionFlyout = memo(function EditExceptionFlyout({
  ruleName,
  ruleId,
  ruleIndices,
  dataViewId,
  exceptionItem,
  exceptionListType,
  onCancel,
  onConfirm,
  onRuleChange,
}: EditExceptionFlyoutProps) {
  const { http, unifiedSearch, data } = useKibana().services;
  const [comment, setComment] = useState('');
  const [errorsExist, setErrorExists] = useState(false);
  const { data: maybeRule, isLoading: isRuleLoading } = useRule(ruleId);
  const [updateError, setUpdateError] = useState<ErrorInfo | null>(null);
  const [hasVersionConflict, setHasVersionConflict] = useState(false);
  const [shouldBulkCloseAlert, setShouldBulkCloseAlert] = useState(false);
  const [shouldDisableBulkClose, setShouldDisableBulkClose] = useState(false);
  const [exceptionItemsToAdd, setExceptionItemsToAdd] = useState<
    ExceptionsBuilderReturnExceptionItem[]
  >([]);
  const { addError, addSuccess } = useAppToasts();
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

  // Don't fetch indices if rule has data view id (currently rule can technically have
  // both defined and in that case we'd be doing unnecessary work here if all we want is
  // the data view fields)
  const [isIndexPatternLoading, { indexPatterns: indexIndexPatterns }] = useFetchIndex(
    hasDataViewId ? [] : memoRuleIndices
  );

  const indexPattern = useMemo(
    (): DataViewBase | null => (hasDataViewId ? dataViewIndexPatterns : indexIndexPatterns),
    [hasDataViewId, dataViewIndexPatterns, indexIndexPatterns]
  );

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
      addSuccess(sharedI18n.DISASSOCIATE_LIST_SUCCESS(id));

      if (onRuleChange) {
        onRuleChange();
      }

      onCancel();
    },
    [addSuccess, onCancel, onRuleChange]
  );

  const handleDissasociationError = useCallback(
    (error: Error): void => {
      addError(error, { title: sharedI18n.DISASSOCIATE_EXCEPTION_LIST_ERROR });
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
      exceptionItems: ExceptionsBuilderReturnExceptionItem[];
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
    let enriched: ExceptionsBuilderReturnExceptionItem[] = [
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
      addOrUpdateExceptionItems(
        maybeRule?.rule_id ?? '',
        // This is being rewritten in https://github.com/elastic/kibana/pull/140643
        // As of now, flyout cannot yet create item of type CreateRuleExceptionListItemSchema
        enrichExceptionItems() as Array<ExceptionListItemSchema | CreateExceptionListItemSchema>,
        undefined,
        bulkCloseIndex
      );
    }
  }, [
    addOrUpdateExceptionItems,
    maybeRule,
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

  const osDisplay = (osTypes: OsTypeArray): string => {
    const translateOS = (currentOs: OsType): string => {
      return currentOs === 'linux'
        ? sharedI18n.OPERATING_SYSTEM_LINUX
        : currentOs === 'macos'
        ? sharedI18n.OPERATING_SYSTEM_MAC
        : sharedI18n.OPERATING_SYSTEM_WINDOWS;
    };
    return osTypes
      .reduce((osString, currentOs) => {
        return `${translateOS(currentOs)}, ${osString}`;
      }, '')
      .slice(0, -2);
  };

  const allowLargeValueLists = useMemo(
    () => (maybeRule != null ? ruleTypesThatAllowLargeValueLists.includes(maybeRule.type) : false),
    [maybeRule]
  );

  return (
    <EuiFlyout size="l" onClose={onCancel} data-test-subj="edit-exception-flyout">
      <FlyoutHeader>
        <EuiTitle>
          <h2 data-test-subj="exception-flyout-title">
            {exceptionListType === 'endpoint'
              ? i18n.EDIT_ENDPOINT_EXCEPTION_TITLE
              : i18n.EDIT_EXCEPTION_TITLE}
          </h2>
        </EuiTitle>
        <EuiSpacer size="xs" />
        <FlyoutSubtitle className="eui-textTruncate" title={ruleName} />
        <EuiSpacer size="m" />
      </FlyoutHeader>
      {(addExceptionIsLoading || isIndexPatternLoading || isSignalIndexLoading) && (
        <Loader data-test-subj="loadingEditExceptionFlyout" size="xl" />
      )}
      {!isSignalIndexLoading &&
        indexPattern != null &&
        !addExceptionIsLoading &&
        !isIndexPatternLoading &&
        !isRuleLoading &&
        !mlJobLoading && (
          <EuiFlyoutBody>
            <FlyoutBodySection className="builder-section">
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
              {exceptionListType === 'endpoint' && (
                <>
                  <EuiText size="xs">
                    <dl>
                      <dt>{sharedI18n.OPERATING_SYSTEM_LABEL}</dt>
                      <dd>{osDisplay(exceptionItem.os_types)}</dd>
                    </dl>
                  </EuiText>
                  <EuiSpacer />
                </>
              )}
              {getExceptionBuilderComponentLazy({
                allowLargeValueLists,
                httpService: http,
                autocompleteService: unifiedSearch.autocomplete,
                exceptionListItems: [exceptionItem],
                listType: exceptionListType,
                listId: exceptionItem.list_id,
                listNamespaceType: exceptionItem.namespace_type,
                listTypeSpecificIndexPatternFilter: filterIndexPatterns,
                ruleName,
                isOrDisabled: true,
                isAndDisabled: false,
                osTypes: exceptionItem.os_types,
                isNestedDisabled: false,
                dataTestSubj: 'edit-exception-builder',
                idAria: 'edit-exception-builder',
                onChange: handleBuilderOnChange,
                indexPatterns: indexPattern,
              })}

              <EuiSpacer />

              <ExceptionItemComments
                exceptionItemComments={exceptionItem.comments}
                newCommentValue={comment}
                newCommentOnChange={onCommentChange}
              />
            </FlyoutBodySection>
            <EuiHorizontalRule />
            <FlyoutCheckboxesSection>
              <EuiFormRow fullWidth>
                <EuiCheckbox
                  data-test-subj="close-alert-on-add-edit-exception-checkbox"
                  id="close-alert-on-add-edit-exception-checkbox"
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
                  <EuiText data-test-subj="edit-exception-endpoint-text" color="subdued" size="s">
                    {i18n.ENDPOINT_QUARANTINE_TEXT}
                  </EuiText>
                </>
              )}
            </FlyoutCheckboxesSection>
          </EuiFlyoutBody>
        )}

      <EuiFlyoutFooter>
        {hasVersionConflict && (
          <>
            <EuiCallOut
              title={i18n.VERSION_CONFLICT_ERROR_TITLE}
              color="danger"
              iconType="alert"
              data-test-subj="exceptionsFlyoutVersionConflict"
            >
              <p>{i18n.VERSION_CONFLICT_ERROR_DESCRIPTION}</p>
            </EuiCallOut>
            <EuiSpacer size="m" />
          </>
        )}
        {updateError != null && (
          <>
            <ErrorCallout
              http={http}
              errorInfo={updateError}
              rule={maybeRule ?? null}
              onCancel={onCancel}
              onSuccess={handleDissasociationSuccess}
              onError={handleDissasociationError}
            />
            <EuiSpacer size="m" />
          </>
        )}
        {updateError === null && (
          <FlyoutFooterGroup justifyContent="spaceBetween">
            <EuiButtonEmpty data-test-subj="cancelExceptionAddButton" onClick={onCancel}>
              {i18n.CANCEL}
            </EuiButtonEmpty>

            <EuiButton
              data-test-subj="edit-exception-confirm-button"
              onClick={onEditExceptionConfirm}
              isLoading={addExceptionIsLoading}
              isDisabled={isSubmitButtonDisabled}
              fill
            >
              {i18n.EDIT_EXCEPTION_SAVE_BUTTON}
            </EuiButton>
          </FlyoutFooterGroup>
        )}
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
});
