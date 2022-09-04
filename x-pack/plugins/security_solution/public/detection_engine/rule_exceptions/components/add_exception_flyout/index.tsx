/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Component being re-implemented in 8.5

/* eslint complexity: ["error", 35]*/

import React, { memo, useEffect, useCallback, useMemo, useReducer } from 'react';
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
  EuiSpacer,
  EuiFlexGroup,
  EuiLoadingContent,
} from '@elastic/eui';
import { ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';
import type {
  ExceptionListType,
  OsTypeArray,
  ExceptionListItemSchema,
  CreateExceptionListItemSchema,
} from '@kbn/securitysolution-io-ts-list-types';
import {
  isEqlRule,
  isNewTermsRule,
  isThresholdRule,
} from '../../../../../common/detection_engine/utils';
import type { Status } from '../../../../../common/detection_engine/schemas/common/schemas';
import * as i18n from './translations';
import * as sharedI18n from '../../utils/translations';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { useKibana } from '../../../../common/lib/kibana';
import { useAddOrUpdateException } from '../../logic/use_add_exception';
import {
  enrichNewExceptionItemsWithComments,
  enrichExceptionItemsWithOS,
  lowercaseHashValues,
  defaultEndpointExceptionItems,
  retrieveAlertOsTypes,
  filterIndexPatterns,
  enrichNewExceptionItemsWithName,
  enrichSharedExceptions,
  enrichRuleExceptions,
} from '../../utils/helpers';
import { ErrorCallout } from '../error_callout';
import type { AlertData } from '../../utils/types';
import type { State } from '../add_edit_flyout_components/reducer';
import { createExceptionItemsReducer } from '../add_edit_flyout_components/reducer';
import { ExceptionsFlyoutMeta } from '../add_edit_flyout_components/item_meta_info';
import { ExceptionsConditions } from '../add_edit_flyout_components/item_conditions';
import { useFetchIndexPatterns } from '../../logic/use_exception_flyout_data';
import type { Rule } from '../../../../detections/containers/detection_engine/rules/types';
import { ExceptionsFlyoutComments } from '../add_edit_flyout_components/item_comments';
import { ExceptionsAddToLists } from '../add_edit_flyout_components/list_options';
import { ExceptionItemsFlyoutAlertOptions } from '../add_edit_flyout_components/close_alerts_options';
import { useAddRuleException } from '../../logic/use_add_rule_exception';
import { useCloseAlertsFromExceptions } from '../../logic/use_close_alerts';

const initialState: State = {
  exceptionItems: [],
  exceptionItemMeta: { name: '' },
  newComment: '',
  errorsExist: false,
  closeSingleAlert: false,
  bulkCloseAlerts: false,
  disableBulkClose: false,
  bulkCloseIndex: undefined,
  selectedListsToAddTo: [],
  selectedOs: undefined,
  addExceptionToRule: true,
  exceptionListsToAddTo: [],
  listsOptionsRadioSelection: 'add_to_rule',
  selectedRulesToAddTo: [],
};

export interface AddExceptionFlyoutProps {
  rules: Rule[] | null;
  isBulkAction: boolean;
  exceptionListType: ExceptionListType;
  showAlertCloseOptions: boolean;
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

const FlyoutBodySection = styled(EuiFlyoutBody)`
  ${() => css`
    &.builder-section {
      overflow-y: scroll;
    }
  `}
`;

const FlyoutHeader = styled(EuiFlyoutHeader)`
  ${({ theme }) => css`
    border-bottom: 1px solid ${theme.eui.euiColorLightShade};
  `}
`;

const FlyoutFooterGroup = styled(EuiFlexGroup)`
  ${({ theme }) => css`
    padding: ${theme.eui.euiSizeS};
  `}
`;

export const AddExceptionFlyout = memo(function AddExceptionFlyout({
  rules,
  isBulkAction,
  exceptionListType,
  alertData,
  showAlertCloseOptions,
  isAlertDataLoading,
  alertStatus,
  onCancel,
  onConfirm,
  onRuleChange,
}: AddExceptionFlyoutProps) {
  const { http } = useKibana().services;
  const { addError, addSuccess } = useAppToasts();

  const { isLoading, indexPatterns } = useFetchIndexPatterns(rules);
  const [isAddRuleExceptionLoading, addRuleExceptions] = useAddRuleException();
  const [isClosingAlerts, closeAlerts] = useCloseAlertsFromExceptions();
  const [isAddingExceptions, addSharedExceptions] = useAddOrUpdateException();

  const allowLargeValueLists = useMemo((): boolean => {
    if (rules != null && rules.length === 1) {
      // We'll only block this when we know what rule we're dealing with.
      // When dealing with numerous rules that can be a mix of those that do and
      // don't work with large value lists we'll need to communicate that to the
      // user but not block.
      return (
        !isEqlRule(rules[0].type) &&
        !isThresholdRule(rules[0].type) &&
        !isNewTermsRule(rules[0].type)
      );
    } else {
      return true;
    }
  }, [rules]);

  const [
    {
      exceptionItemMeta: { name: exceptionItemName },
      selectedOs,
      exceptionItems,
      disableBulkClose,
      bulkCloseAlerts,
      closeSingleAlert,
      bulkCloseIndex,
      addExceptionToRule,
      listsOptionsRadioSelection,
      selectedRulesToAddTo,
      exceptionListsToAddTo,
      newComment,
      errorsExist,
    },
    dispatch,
  ] = useReducer(createExceptionItemsReducer(), {
    ...initialState,
    listsOptionsRadioSelection: isBulkAction
      ? 'add_to_rules'
      : rules !== null && rules.length === 1
      ? 'add_to_rule'
      : 'select_rules_to_add_to',
  });

  const hasAlertData = useMemo((): boolean => {
    return alertData != null;
  }, [alertData]);

  /**
   * Reducer action dispatchers
   * */
  const setExceptionItemsToAdd = useCallback(
    (items: Array<ExceptionListItemSchema | CreateExceptionListItemSchema>): void => {
      console.log('ADDING', {items})
      dispatch({
        type: 'setExceptionItems',
        items,
      });
    },
    [dispatch]
  );

  useEffect((): void => {
    if (exceptionListType === 'endpoint' && hasAlertData) {
      setExceptionItemsToAdd(
        defaultEndpointExceptionItems(ENDPOINT_LIST_ID, exceptionItemName, alertData)
      );
    }
  }, [exceptionListType, exceptionItemName, hasAlertData, alertData, setExceptionItemsToAdd]);

  const handleRuleChange = useCallback(
    (ruleChanged: boolean): void => {
      if (ruleChanged && onRuleChange) {
        onRuleChange();
      }
    },
    [onRuleChange]
  );

  const onError = useCallback((): void => {
    onCancel();
  }, [onCancel]);

  const onSuccess = useCallback((): void => {
    handleRuleChange(true);
    onConfirm(closeSingleAlert, bulkCloseAlerts);
  }, [onConfirm, bulkCloseAlerts, closeSingleAlert, handleRuleChange]);

  const osTypesSelection = useMemo((): OsTypeArray => {
    return hasAlertData ? retrieveAlertOsTypes(alertData) : selectedOs ? [...selectedOs] : [];
  }, [hasAlertData, alertData, selectedOs]);

  const enrichExceptionItems = useCallback((): Array<
    ExceptionListItemSchema | CreateExceptionListItemSchema
  > => {
    let enriched: Array<ExceptionListItemSchema | CreateExceptionListItemSchema> = [];
    enriched =
      newComment !== ''
        ? enrichNewExceptionItemsWithComments(exceptionItems, [{ comment: newComment }])
        : exceptionItems;

    // enrichments that apply to all
    if (exceptionItemName.trim() !== '') {
      enriched = enrichNewExceptionItemsWithName(exceptionItems, exceptionItemName);
    }

    // enrichments that are list type specific
    if (exceptionListType === 'endpoint') {
      const osTypes = osTypesSelection;
      enriched = lowercaseHashValues(enrichExceptionItemsWithOS(enriched, osTypes));
    } else if (addExceptionToRule) {
      enriched = enrichRuleExceptions(enriched);
    } else {
      enriched = enrichSharedExceptions(exceptionListsToAddTo, enriched);
    }

    return enriched;
  }, [
    newComment,
    exceptionItems,
    exceptionItemName,
    exceptionListType,
    addExceptionToRule,
    osTypesSelection,
    exceptionListsToAddTo,
  ]);

  const handleOnSubmit = useCallback(async (): Promise<void> => {
    try {
      const items = enrichExceptionItems();

      // if listsOptionsRadioSelection is one of the rule ones and selectedRulesToAddTo is not empty
      // will need to go through and add to those rule's default rule list

      // if listsOptionsRadioSelection is add to shared list, create the items in the selected shared lists 

      if (addExceptionToRule && addRuleExceptions != null) {
        await addRuleExceptions(items, rules[0]?.id, rules[0]?.name);
      } else if (!addExceptionToRule && addSharedExceptions != null) {
        await addSharedExceptions(items);
      }

      if (closeAlerts != null && (bulkCloseAlerts || closeSingleAlert)) {
        const alertIdToClose = closeSingleAlert && alertData ? alertData._id : undefined;
        await closeAlerts(rules[0]?.rule_id ?? '', items, alertIdToClose, bulkCloseIndex);
      }
    } catch {
      onError();
    }
  }, [
    addExceptionToRule,
    addRuleExceptions,
    addSharedExceptions,
    alertData,
    bulkCloseAlerts,
    bulkCloseIndex,
    closeAlerts,
    closeSingleAlert,
    enrichExceptionItems,
    onError,
    rules
  ]);

  const isSubmitButtonDisabled = useMemo(
    (): boolean =>
      isAddRuleExceptionLoading ||
      isAddingExceptions ||
      exceptionItemName.trim() === '' ||
      exceptionItems.every((item) => item.entries.length === 0) ||
      errorsExist,
    [isAddRuleExceptionLoading, isAddingExceptions, exceptionItemName, exceptionItems, errorsExist]
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

  const addExceptionMessage = useMemo(() => {
    return exceptionListType === 'endpoint'
      ? i18n.ADD_ENDPOINT_EXCEPTION
      : i18n.CREATE_RULE_EXCEPTION;
  }, [exceptionListType]);

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
        <EuiSpacer size="m" />
      </FlyoutHeader>

      {isLoading && <EuiLoadingContent data-test-subj="loadingAddExceptionFlyout" lines={4} />}
      {!isLoading && (
        <FlyoutBodySection className="builder-section">
          <ExceptionsFlyoutMeta exceptionItemName={exceptionItemName} dispatch={dispatch} />
          <EuiHorizontalRule />
          <ExceptionsConditions
            exceptionItemName={exceptionItemName}
            allowLargeValueLists={allowLargeValueLists}
            exceptionListItems={exceptionItems}
            indexPatterns={indexPatterns}
            rules={rules}
            dispatch={dispatch}
            handleFilterIndexPatterns={filterIndexPatterns}
            selectedOs={selectedOs}
            showOsTypeOptions={
              exceptionListType === ExceptionListTypeEnum.ENDPOINT && !hasAlertData
            }
            isEdit={false}
          />

          {exceptionListType !== ExceptionListTypeEnum.ENDPOINT && (
            <>
              <EuiHorizontalRule />
              <ExceptionsAddToLists
                rules={null}
                addToRulesOrListsSelection={'select_rules_to_add_to'}
                isBulkAction={false}
                isSingleRule={false}
                dispatch={dispatch}
              />
            </>
          )}
          {showAlertCloseOptions && !isAlertDataLoading && (
            <>
              <EuiHorizontalRule />
              <ExceptionItemsFlyoutAlertOptions
                exceptionListType={exceptionListType}
                shouldCloseSingleAlert={closeSingleAlert}
                shouldBulkCloseAlert={bulkCloseAlerts}
                disableBulkClose={disableBulkClose}
                dispatch={dispatch}
                exceptionListItems={exceptionItems}
                alertData={alertData}
                alertStatus={alertStatus}
              />
            </>
          )}
          <EuiHorizontalRule />
          <ExceptionsFlyoutComments newComment={newComment} dispatch={dispatch} />
        </FlyoutBodySection>
      )}
      {errorsExist && (
        <ErrorCallout
          http={http}
          errorInfo={errorsExist}
          rule={rules}
          onCancel={onCancel}
          onSuccess={handleDissasociationSuccess}
          onError={handleDissasociationError}
          data-test-subj="addExceptionFlyoutErrorCallout"
        />
      )}
      <EuiFlyoutFooter>
        <FlyoutFooterGroup justifyContent="spaceBetween">
          <EuiButtonEmpty data-test-subj="cancelExceptionAddButton" onClick={onCancel}>
            {i18n.CANCEL}
          </EuiButtonEmpty>

          <EuiButton
            data-test-subj="add-exception-confirm-button"
            onClick={handleOnSubmit}
            isLoading={isAddRuleExceptionLoading || isClosingAlerts || isAddingExceptions}
            isDisabled={isSubmitButtonDisabled}
            fill
          >
            {addExceptionMessage}
          </EuiButton>
        </FlyoutFooterGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
});
