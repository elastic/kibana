/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useEffect, useCallback, useMemo, useReducer } from 'react';
import styled, { css } from 'styled-components';
import { isEmpty } from 'lodash/fp';

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
  EuiCallOut,
  EuiText,
} from '@elastic/eui';

import { ENDPOINT_LIST_ID } from '@kbn/securitysolution-list-constants';
import { ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';
import type { OsTypeArray, ExceptionListSchema } from '@kbn/securitysolution-io-ts-list-types';
import type {
  ExceptionsBuilderExceptionItem,
  ExceptionsBuilderReturnExceptionItem,
} from '@kbn/securitysolution-list-utils';

import type { Status } from '../../../../../common/detection_engine/schemas/common/schemas';
import * as i18n from './translations';
import { ExceptionItemComments } from '../item_comments';
import {
  defaultEndpointExceptionItems,
  retrieveAlertOsTypes,
  filterIndexPatterns,
} from '../../utils/helpers';
import type { AlertData } from '../../utils/types';
import { initialState, createExceptionItemsReducer } from './reducer';
import { ExceptionsFlyoutMeta } from '../flyout_components/item_meta_form';
import { ExceptionsConditions } from '../flyout_components/item_conditions';
import { useFetchIndexPatterns } from '../../logic/use_exception_flyout_data';
import type { Rule } from '../../../rule_management/logic/types';
import { ExceptionItemsFlyoutAlertsActions } from '../flyout_components/alerts_actions';
import { ExceptionsAddToRulesOrLists } from '../flyout_components/add_exception_to_rule_or_list';
import { useAddNewExceptionItems } from './use_add_new_exceptions';
import { enrichNewExceptionItems } from '../flyout_components/utils';
import { useCloseAlertsFromExceptions } from '../../logic/use_close_alerts';
import { ruleTypesThatAllowLargeValueLists } from '../../utils/constants';
import { useInvalidateFetchRuleByIdQuery } from '../../../rule_management/api/hooks/use_fetch_rule_by_id_query';

const SectionHeader = styled(EuiTitle)`
  ${() => css`
    font-weight: ${({ theme }) => theme.eui.euiFontWeightSemiBold};
  `}
`;

export interface AddExceptionFlyoutProps {
  rules: Rule[] | null;
  isBulkAction: boolean;
  showAlertCloseOptions: boolean;
  isEndpointItem: boolean;
  alertData?: AlertData;
  /**
   * The components that use this may or may not define `alertData`
   * If they do, they need to fetch it async. In that case `alertData` will be
   * undefined while `isAlertDataLoading` will be true. In the case that `alertData`
   *  is not used, `isAlertDataLoading` will be undefined
   */
  isAlertDataLoading?: boolean;
  alertStatus?: Status;
  sharedListToAddTo?: ExceptionListSchema[];
  onCancel: (didRuleChange: boolean) => void;
  onConfirm: (didRuleChange: boolean, didCloseAlert: boolean, didBulkCloseAlert: boolean) => void;
  isNonTimeline?: boolean;
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
  isEndpointItem,
  alertData,
  showAlertCloseOptions,
  isAlertDataLoading,
  alertStatus,
  sharedListToAddTo,
  onCancel,
  onConfirm,
  isNonTimeline = false,
}: AddExceptionFlyoutProps) {
  const { isLoading, indexPatterns } = useFetchIndexPatterns(rules);
  const [isSubmitting, submitNewExceptionItems] = useAddNewExceptionItems();
  const [isClosingAlerts, closeAlerts] = useCloseAlertsFromExceptions();
  const invalidateFetchRuleByIdQuery = useInvalidateFetchRuleByIdQuery();
  const allowLargeValueLists = useMemo((): boolean => {
    if (rules != null && rules.length === 1) {
      // We'll only block this when we know what rule we're dealing with.
      // When dealing with numerous rules that can be a mix of those that do and
      // don't work with large value lists we'll need to communicate that to the
      // user but not block.
      return ruleTypesThatAllowLargeValueLists.includes(rules[0].type);
    } else {
      return true;
    }
  }, [rules]);

  const getListType = useMemo(() => {
    if (isEndpointItem) return ExceptionListTypeEnum.ENDPOINT;
    if (sharedListToAddTo) return ExceptionListTypeEnum.DETECTION;

    return ExceptionListTypeEnum.RULE_DEFAULT;
  }, [isEndpointItem, sharedListToAddTo]);
  const [
    {
      exceptionItemMeta: { name: exceptionItemName },
      listType,
      selectedOs,
      initialItems,
      exceptionItems,
      disableBulkClose,
      bulkCloseAlerts,
      closeSingleAlert,
      bulkCloseIndex,
      addExceptionToRadioSelection,
      selectedRulesToAddTo,
      exceptionListsToAddTo,
      newComment,
      itemConditionValidationErrorExists,
      errorSubmitting,
    },
    dispatch,
  ] = useReducer(createExceptionItemsReducer(), {
    ...initialState,
    addExceptionToRadioSelection: isBulkAction
      ? 'add_to_rules'
      : rules != null && rules.length === 1
      ? 'add_to_rule'
      : 'select_rules_to_add_to',
    listType: getListType,
    selectedRulesToAddTo: rules != null ? rules : [],
  });
  const hasAlertData = useMemo((): boolean => {
    return alertData != null;
  }, [alertData]);

  /**
   * Reducer action dispatchers
   * */
  const setInitialExceptionItems = useCallback(
    (items: ExceptionsBuilderExceptionItem[]): void => {
      dispatch({
        type: 'setInitialExceptionItems',
        items,
      });
    },
    [dispatch]
  );

  const setExceptionItemsToAdd = useCallback(
    (items: ExceptionsBuilderReturnExceptionItem[]): void => {
      dispatch({
        type: 'setExceptionItems',
        items,
      });
    },
    [dispatch]
  );

  const setRadioOption = useCallback(
    (option: string): void => {
      dispatch({
        type: 'setListOrRuleRadioOption',
        option,
      });
    },
    [dispatch]
  );

  const setSelectedRules = useCallback(
    (rulesSelectedToAdd: Rule[]): void => {
      dispatch({
        type: 'setSelectedRulesToAddTo',
        rules: rulesSelectedToAdd,
      });
    },
    [dispatch]
  );

  const setListsToAddExceptionTo = useCallback(
    (lists: ExceptionListSchema[]): void => {
      dispatch({
        type: 'setAddExceptionToLists',
        listsToAddTo: lists,
      });
    },
    [dispatch]
  );

  const setExceptionItemMeta = useCallback(
    (value: [string, string]): void => {
      dispatch({
        type: 'setExceptionItemMeta',
        value,
      });
    },
    [dispatch]
  );

  const setConditionsValidationError = useCallback(
    (errorExists: boolean): void => {
      dispatch({
        type: 'setConditionValidationErrorExists',
        errorExists,
      });
    },
    [dispatch]
  );

  const setSelectedOs = useCallback(
    (os: OsTypeArray | undefined): void => {
      dispatch({
        type: 'setSelectedOsOptions',
        selectedOs: os,
      });
    },
    [dispatch]
  );

  const setComment = useCallback(
    (comment: string): void => {
      dispatch({
        type: 'setComment',
        comment,
      });
    },
    [dispatch]
  );

  const setBulkCloseIndex = useCallback(
    (index: string[] | undefined): void => {
      dispatch({
        type: 'setBulkCloseIndex',
        bulkCloseIndex: index,
      });
    },
    [dispatch]
  );

  const setCloseSingleAlert = useCallback(
    (close: boolean): void => {
      dispatch({
        type: 'setCloseSingleAlert',
        close,
      });
    },
    [dispatch]
  );

  const setBulkCloseAlerts = useCallback(
    (bulkClose: boolean): void => {
      dispatch({
        type: 'setBulkCloseAlerts',
        bulkClose,
      });
    },
    [dispatch]
  );

  const setDisableBulkCloseAlerts = useCallback(
    (disableBulkCloseAlerts: boolean): void => {
      dispatch({
        type: 'setDisableBulkCloseAlerts',
        disableBulkCloseAlerts,
      });
    },
    [dispatch]
  );

  const setErrorSubmitting = useCallback(
    (err: Error | null): void => {
      dispatch({
        type: 'setErrorSubmitting',
        err,
      });
    },
    [dispatch]
  );

  useEffect((): void => {
    if (listType === ExceptionListTypeEnum.ENDPOINT && alertData != null) {
      setInitialExceptionItems(
        defaultEndpointExceptionItems(ENDPOINT_LIST_ID, exceptionItemName, alertData)
      );
    }
  }, [listType, exceptionItemName, alertData, setInitialExceptionItems]);

  const osTypesSelection = useMemo((): OsTypeArray => {
    return hasAlertData ? retrieveAlertOsTypes(alertData) : selectedOs ? [...selectedOs] : [];
  }, [hasAlertData, alertData, selectedOs]);

  const handleOnSubmit = useCallback(async (): Promise<void> => {
    if (submitNewExceptionItems == null) return;

    try {
      const ruleDefaultOptions = ['add_to_rule', 'add_to_rules', 'select_rules_to_add_to'];
      const addToRules = ruleDefaultOptions.includes(addExceptionToRadioSelection);
      const addToSharedLists =
        !!sharedListToAddTo?.length ||
        (addExceptionToRadioSelection === 'add_to_lists' && !isEmpty(exceptionListsToAddTo));
      const sharedLists = sharedListToAddTo?.length ? sharedListToAddTo : exceptionListsToAddTo;

      const items = enrichNewExceptionItems({
        itemName: exceptionItemName,
        commentToAdd: newComment,
        addToRules,
        addToSharedLists,
        sharedLists,
        listType,
        selectedOs: osTypesSelection,
        items: exceptionItems,
      });

      const addedItems = await submitNewExceptionItems({
        itemsToAdd: items,
        selectedRulesToAddTo,
        listType,
        addToRules: addToRules && !isEmpty(selectedRulesToAddTo),
        addToSharedLists,
        sharedLists,
      });

      const alertIdToClose = closeSingleAlert && alertData ? alertData._id : undefined;
      const ruleStaticIds = addToRules
        ? selectedRulesToAddTo.map(({ rule_id: ruleId }) => ruleId)
        : (rules ?? []).map(({ rule_id: ruleId }) => ruleId);

      if (closeAlerts != null && !isEmpty(ruleStaticIds) && (bulkCloseAlerts || closeSingleAlert)) {
        await closeAlerts(ruleStaticIds, addedItems, alertIdToClose, bulkCloseIndex);
      }

      invalidateFetchRuleByIdQuery();
      // Rule only would have been updated if we had to create a rule default list
      // to attach to it, all shared lists would already be referenced on the rule
      onConfirm(true, closeSingleAlert, bulkCloseAlerts);
    } catch (e) {
      setErrorSubmitting(e);
    }
  }, [
    sharedListToAddTo,
    submitNewExceptionItems,
    addExceptionToRadioSelection,
    exceptionItemName,
    newComment,
    exceptionListsToAddTo,
    listType,
    osTypesSelection,
    exceptionItems,
    selectedRulesToAddTo,
    closeSingleAlert,
    alertData,
    rules,
    closeAlerts,
    bulkCloseAlerts,
    onConfirm,
    bulkCloseIndex,
    setErrorSubmitting,
    invalidateFetchRuleByIdQuery,
  ]);

  const isSubmitButtonDisabled = useMemo(
    (): boolean =>
      isSubmitting ||
      isClosingAlerts ||
      errorSubmitting != null ||
      exceptionItemName.trim() === '' ||
      exceptionItems.every((item) => item.entries.length === 0) ||
      itemConditionValidationErrorExists ||
      (addExceptionToRadioSelection === 'add_to_lists' && isEmpty(exceptionListsToAddTo)),
    [
      isSubmitting,
      isClosingAlerts,
      errorSubmitting,
      exceptionItemName,
      exceptionItems,
      itemConditionValidationErrorExists,
      addExceptionToRadioSelection,
      exceptionListsToAddTo,
    ]
  );

  const handleDismissError = useCallback((): void => {
    setErrorSubmitting(null);
  }, [setErrorSubmitting]);

  const handleCloseFlyout = useCallback((): void => {
    onCancel(false);
  }, [onCancel]);

  const addExceptionMessage = useMemo(() => {
    return listType === ExceptionListTypeEnum.ENDPOINT
      ? i18n.ADD_ENDPOINT_EXCEPTION
      : i18n.CREATE_RULE_EXCEPTION;
  }, [listType]);

  return (
    <EuiFlyout
      ownFocus
      maskProps={{ style: isNonTimeline === false ? 'z-index: 5000' : 'z-index: 1000' }} // For an edge case to display above the timeline flyout
      size="l"
      onClose={handleCloseFlyout}
      data-test-subj="addExceptionFlyout"
    >
      <FlyoutHeader>
        <EuiTitle>
          <h2 data-test-subj="exceptionFlyoutTitle">{addExceptionMessage}</h2>
        </EuiTitle>
        <EuiSpacer size="m" />
      </FlyoutHeader>

      {isLoading && <EuiLoadingContent data-test-subj="loadingAddExceptionFlyout" lines={4} />}
      {!isLoading && (
        <FlyoutBodySection className="builder-section">
          {errorSubmitting != null && (
            <>
              <EuiCallOut title={i18n.SUBMIT_ERROR_TITLE} color="danger" iconType="alert">
                <EuiText>{i18n.SUBMIT_ERROR_DISMISS_MESSAGE}</EuiText>
                <EuiSpacer size="s" />
                <EuiButton color="danger" onClick={handleDismissError}>
                  {i18n.SUBMIT_ERROR_DISMISS_BUTTON}
                </EuiButton>
              </EuiCallOut>
              <EuiSpacer size="s" />
            </>
          )}
          <ExceptionsFlyoutMeta
            exceptionItemName={exceptionItemName}
            onChange={setExceptionItemMeta}
          />
          <EuiHorizontalRule />
          <ExceptionsConditions
            exceptionItemName={exceptionItemName}
            allowLargeValueLists={allowLargeValueLists}
            exceptionListItems={initialItems}
            exceptionListType={listType}
            indexPatterns={indexPatterns}
            rules={rules}
            selectedOs={selectedOs}
            showOsTypeOptions={listType === ExceptionListTypeEnum.ENDPOINT && !hasAlertData}
            isEdit={false}
            onOsChange={setSelectedOs}
            onExceptionItemAdd={setExceptionItemsToAdd}
            onSetErrorExists={setConditionsValidationError}
            onFilterIndexPatterns={filterIndexPatterns}
          />

          {listType !== ExceptionListTypeEnum.ENDPOINT && !sharedListToAddTo?.length && (
            <>
              <EuiHorizontalRule />
              <ExceptionsAddToRulesOrLists
                rules={rules}
                isBulkAction={isBulkAction}
                selectedRadioOption={addExceptionToRadioSelection}
                onListSelectionChange={setListsToAddExceptionTo}
                onRuleSelectionChange={setSelectedRules}
                onRadioChange={setRadioOption}
              />
            </>
          )}
          <EuiHorizontalRule />
          <ExceptionItemComments
            accordionTitle={
              <SectionHeader size="xs">
                <h3>{i18n.COMMENTS_SECTION_TITLE(0)}</h3>
              </SectionHeader>
            }
            newCommentValue={newComment}
            newCommentOnChange={setComment}
          />
          {showAlertCloseOptions && (
            <>
              <EuiHorizontalRule />
              <ExceptionItemsFlyoutAlertsActions
                exceptionListType={listType}
                shouldCloseSingleAlert={closeSingleAlert}
                shouldBulkCloseAlert={bulkCloseAlerts}
                disableBulkClose={disableBulkClose}
                exceptionListItems={exceptionItems}
                alertData={alertData}
                alertStatus={alertStatus}
                isAlertDataLoading={isAlertDataLoading ?? false}
                onDisableBulkClose={setDisableBulkCloseAlerts}
                onUpdateBulkCloseIndex={setBulkCloseIndex}
                onBulkCloseCheckboxChange={setBulkCloseAlerts}
                onSingleAlertCloseCheckboxChange={setCloseSingleAlert}
              />
            </>
          )}
        </FlyoutBodySection>
      )}
      <EuiFlyoutFooter>
        <FlyoutFooterGroup justifyContent="spaceBetween">
          <EuiButtonEmpty data-test-subj="cancelExceptionAddButton" onClick={handleCloseFlyout}>
            {i18n.CANCEL}
          </EuiButtonEmpty>

          <EuiButton
            data-test-subj="addExceptionConfirmButton"
            onClick={handleOnSubmit}
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
