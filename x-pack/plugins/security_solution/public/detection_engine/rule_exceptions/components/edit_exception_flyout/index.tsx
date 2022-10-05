/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useReducer } from 'react';
import styled, { css } from 'styled-components';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiHorizontalRule,
  EuiSpacer,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiFlexGroup,
  EuiTitle,
  EuiFlyout,
  EuiFlyoutFooter,
  EuiLoadingContent,
} from '@elastic/eui';

import type {
  ExceptionListItemSchema,
  ExceptionListSchema,
} from '@kbn/securitysolution-io-ts-list-types';
import { ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';

import { isEmpty } from 'lodash/fp';
import type { ExceptionsBuilderReturnExceptionItem } from '@kbn/securitysolution-list-utils';
import * as i18n from './translations';
import { ExceptionsFlyoutMeta } from '../flyout_components/item_meta_form';
import { createExceptionItemsReducer } from './reducer';
import { ExceptionsLinkedToLists } from '../flyout_components/linked_to_list';
import { ExceptionsLinkedToRule } from '../flyout_components/linked_to_rule';
import type { Rule } from '../../../../detections/containers/detection_engine/rules/types';
import { ExceptionItemsFlyoutAlertsActions } from '../flyout_components/alerts_actions';
import { ExceptionsConditions } from '../flyout_components/item_conditions';
import {
  isEqlRule,
  isNewTermsRule,
  isThresholdRule,
} from '../../../../../common/detection_engine/utils';
import { useFetchIndexPatterns } from '../../logic/use_exception_flyout_data';
import { filterIndexPatterns } from '../../utils/helpers';
import { entrichExceptionItemsForUpdate } from '../flyout_components/utils';
import { useEditExceptionItems } from './use_edit_exception';
import { useCloseAlertsFromExceptions } from '../../logic/use_close_alerts';
import { useFindExceptionListReferences } from '../../logic/use_find_references';
import { ExceptionItemComments } from '../item_comments';

interface EditExceptionFlyoutProps {
  list: ExceptionListSchema;
  itemToEdit: ExceptionListItemSchema;
  showAlertCloseOptions: boolean;
  rule?: Rule;
  onCancel: (arg: boolean) => void;
  onConfirm: (arg: boolean) => void;
}

const FlyoutHeader = styled(EuiFlyoutHeader)`
  ${({ theme }) => css`
    border-bottom: 1px solid ${theme.eui.euiColorLightShade};
  `}
`;

const FlyoutBodySection = styled(EuiFlyoutBody)`
  ${() => css`
    &.builder-section {
      overflow-y: scroll;
    }
  `}
`;

const FlyoutFooterGroup = styled(EuiFlexGroup)`
  ${({ theme }) => css`
    padding: ${theme.eui.euiSizeS};
  `}
`;

const EditExceptionFlyoutComponent: React.FC<EditExceptionFlyoutProps> = ({
  list,
  itemToEdit,
  rule,
  showAlertCloseOptions,
  onCancel,
  onConfirm,
}): JSX.Element => {
  const selectedOs = useMemo(() => itemToEdit.os_types, [itemToEdit]);
  const rules = useMemo(() => (rule != null ? [rule] : null), [rule]);

  const { isLoading, indexPatterns } = useFetchIndexPatterns(rules);
  const [isSubmitting, submitEditExceptionItems] = useEditExceptionItems();
  const [isClosingAlerts, closeAlerts] = useCloseAlertsFromExceptions();

  const [
    {
      exceptionItems,
      exceptionItemMeta: { name: exceptionItemName },
      newComment,
      bulkCloseAlerts,
      disableBulkClose,
      bulkCloseIndex,
      entryErrorExists,
    },
    dispatch,
  ] = useReducer(createExceptionItemsReducer(), {
    exceptionItems: [itemToEdit],
    exceptionItemMeta: { name: itemToEdit.name },
    newComment: '',
    bulkCloseAlerts: false,
    disableBulkClose: true,
    bulkCloseIndex: undefined,
    entryErrorExists: false,
  });

  const allowLargeValueLists = useMemo((): boolean => {
    if (rule != null) {
      // We'll only block this when we know what rule we're dealing with.
      // When editing an item outside the context of a specific rule,
      // we won't block but should communicate to the user that large value lists
      // won't be applied to all rule types.
      return !isEqlRule(rule.type) && !isThresholdRule(rule.type) && !isNewTermsRule(rule.type);
    } else {
      return true;
    }
  }, [rule]);

  const [isLoadingReferences, referenceFetchError, ruleReferences, fetchReferences] =
    useFindExceptionListReferences();

  useEffect(() => {
    if (fetchReferences != null) {
      fetchReferences([
        {
          id: list.id,
          listId: list.list_id,
          namespaceType: list.namespace_type,
        },
      ]);
    }
  }, [list, fetchReferences]);

  /**
   * Reducer action dispatchers
   * */
  const setExceptionItemsToAdd = useCallback(
    (items: ExceptionsBuilderReturnExceptionItem[]): void => {
      dispatch({
        type: 'setExceptionItems',
        items,
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

  const setComment = useCallback(
    (comment: string): void => {
      dispatch({
        type: 'setComment',
        comment,
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

  const setBulkCloseIndex = useCallback(
    (index: string[] | undefined): void => {
      dispatch({
        type: 'setBulkCloseIndex',
        bulkCloseIndex: index,
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

  const handleCloseFlyout = useCallback((): void => {
    onCancel(false);
  }, [onCancel]);

  const handleSubmit = useCallback(async (): Promise<void> => {
    if (submitEditExceptionItems == null) return;

    try {
      const items = entrichExceptionItemsForUpdate({
        itemName: exceptionItemName,
        commentToAdd: newComment,
        listType: list.type,
        selectedOs: itemToEdit.os_types,
        items: exceptionItems,
      });
      console.log({ items, exceptionItems });
      await submitEditExceptionItems({
        itemsToUpdate: items,
      });

      const ruleDefaultRule = rule != null ? [rule.rule_id] : [];
      const referencedRules =
        ruleReferences != null
          ? ruleReferences[list.list_id].referenced_rules.map(({ rule_id: ruleId }) => ruleId)
          : [];
      const ruleIdsForBulkClose =
        list.type === ExceptionListTypeEnum.RULE_DEFAULT ? ruleDefaultRule : referencedRules;

      if (closeAlerts != null && !isEmpty(ruleIdsForBulkClose) && bulkCloseAlerts) {
        await closeAlerts(ruleIdsForBulkClose, items, undefined, bulkCloseIndex);
      }

      onConfirm(true);
    } catch (e) {
      onCancel(false);
    }
  }, [
    bulkCloseAlerts,
    bulkCloseIndex,
    closeAlerts,
    exceptionItemName,
    exceptionItems,
    itemToEdit.os_types,
    list.list_id,
    list.type,
    ruleReferences,
    newComment,
    onCancel,
    onConfirm,
    rule,
    submitEditExceptionItems,
  ]);

  const editExceptionMessage = useMemo(
    () =>
      list.type === ExceptionListTypeEnum.ENDPOINT
        ? i18n.EDIT_ENDPOINT_EXCEPTION_TITLE
        : i18n.EDIT_EXCEPTION_TITLE,
    [list.type]
  );

  const isSubmitButtonDisabled = useMemo(
    () =>
      isSubmitting ||
      isClosingAlerts ||
      exceptionItems.every((item) => item.entries.length === 0) ||
      isLoading ||
      entryErrorExists,
    [isLoading, entryErrorExists, exceptionItems, isSubmitting, isClosingAlerts]
  );

  return (
    <EuiFlyout size="l" onClose={handleCloseFlyout} data-test-subj="editExceptionFlyout">
      <FlyoutHeader>
        <EuiTitle>
          <h2 data-test-subj="exceptionFlyoutTitle">{editExceptionMessage}</h2>
        </EuiTitle>
        <EuiSpacer size="m" />
      </FlyoutHeader>
      {isLoading && <EuiLoadingContent data-test-subj="loadingEditExceptionFlyout" lines={4} />}
      <FlyoutBodySection className="builder-section">
        <ExceptionsFlyoutMeta
          exceptionItemName={exceptionItemName}
          onChange={setExceptionItemMeta}
        />
        <EuiHorizontalRule />
        <ExceptionsConditions
          exceptionItemName={exceptionItemName}
          allowLargeValueLists={allowLargeValueLists}
          exceptionListItems={[itemToEdit]}
          exceptionListType={list.type}
          indexPatterns={indexPatterns}
          rules={rules}
          selectedOs={selectedOs}
          showOsTypeOptions={list.type === ExceptionListTypeEnum.ENDPOINT}
          isEdit
          onExceptionItemAdd={setExceptionItemsToAdd}
          onSetErrorExists={setConditionsValidationError}
          onFilterIndexPatterns={filterIndexPatterns}
        />
        {list.type === ExceptionListTypeEnum.DETECTION && (
          <>
            <EuiHorizontalRule />
            <ExceptionsLinkedToLists
              isLoadingReferences={isLoadingReferences}
              errorFetchingReferences={referenceFetchError}
              listAndReferences={ruleReferences != null ? [ruleReferences[list.list_id]] : []}
            />
          </>
        )}
        {list.type === ExceptionListTypeEnum.RULE_DEFAULT && rule != null && (
          <>
            <EuiHorizontalRule />
            <ExceptionsLinkedToRule rule={rule} />
          </>
        )}
        <EuiHorizontalRule />
        <ExceptionItemComments
          exceptionItemComments={itemToEdit.comments}
          newCommentValue={newComment}
          newCommentOnChange={setComment}
        />
        {showAlertCloseOptions && (
          <>
            <EuiHorizontalRule />
            <ExceptionItemsFlyoutAlertsActions
              exceptionListType={list.type}
              shouldBulkCloseAlert={bulkCloseAlerts}
              disableBulkClose={disableBulkClose}
              exceptionListItems={exceptionItems}
              onDisableBulkClose={setDisableBulkCloseAlerts}
              onUpdateBulkCloseIndex={setBulkCloseIndex}
              onBulkCloseCheckboxChange={setBulkCloseAlerts}
            />
          </>
        )}
      </FlyoutBodySection>
      <EuiFlyoutFooter>
        <FlyoutFooterGroup justifyContent="spaceBetween">
          <EuiButtonEmpty data-test-subj="cancelExceptionEditButton" onClick={handleCloseFlyout}>
            {i18n.CANCEL}
          </EuiButtonEmpty>

          <EuiButton
            data-test-subj="editExceptionConfirmButton"
            onClick={handleSubmit}
            isDisabled={isSubmitButtonDisabled}
            fill
          >
            {editExceptionMessage}
          </EuiButton>
        </FlyoutFooterGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};

export const EditExceptionFlyout = React.memo(EditExceptionFlyoutComponent);

EditExceptionFlyout.displayName = 'EditExceptionFlyout';
