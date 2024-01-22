/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash/fp';
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
  EuiSkeletonText,
} from '@elastic/eui';

import type {
  ExceptionListItemSchema,
  ExceptionListSchema,
} from '@kbn/securitysolution-io-ts-list-types';
import {
  updateExceptionListItemSchema,
  ExceptionListTypeEnum,
} from '@kbn/securitysolution-io-ts-list-types';

import type { ExceptionsBuilderReturnExceptionItem } from '@kbn/securitysolution-list-utils';

import type { Moment } from 'moment';
import moment from 'moment';
import {
  isEqlRule,
  isNewTermsRule,
  isThresholdRule,
} from '../../../../../common/detection_engine/utils';

import type { Rule } from '../../../rule_management/logic/types';
import { ExceptionsFlyoutMeta } from '../flyout_components/item_meta_form';
import { ExceptionsLinkedToLists } from '../flyout_components/linked_to_list';
import { ExceptionsLinkedToRule } from '../flyout_components/linked_to_rule';
import { ExceptionItemsFlyoutAlertsActions } from '../flyout_components/alerts_actions';
import { ExceptionsConditions } from '../flyout_components/item_conditions';

import { useFetchIndexPatterns } from '../../logic/use_exception_flyout_data';
import { useCloseAlertsFromExceptions } from '../../logic/use_close_alerts';
import { useFindExceptionListReferences } from '../../logic/use_find_references';
import { enrichExceptionItemsForUpdate } from '../flyout_components/utils';
import { ExceptionItemComments } from '../item_comments';
import { createExceptionItemsReducer } from './reducer';
import { useEditExceptionItems } from './use_edit_exception';

import * as i18n from './translations';
import { ExceptionsExpireTime } from '../flyout_components/expire_time';

interface EditExceptionFlyoutProps {
  list: ExceptionListSchema;
  itemToEdit: ExceptionListItemSchema;
  showAlertCloseOptions: boolean;
  rule?: Rule;
  openedFromListDetailPage?: boolean;
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

const SectionHeader = styled(EuiTitle)`
  ${() => css`
    font-weight: ${({ theme }) => theme.eui.euiFontWeightSemiBold};
  `}
`;

const EditExceptionFlyoutComponent: React.FC<EditExceptionFlyoutProps> = ({
  list,
  itemToEdit,
  rule,
  showAlertCloseOptions,
  openedFromListDetailPage,
  onCancel,
  onConfirm,
}): JSX.Element => {
  const selectedOs = useMemo(() => itemToEdit.os_types, [itemToEdit]);
  const rules = useMemo(() => (rule != null ? [rule] : null), [rule]);
  const listType = useMemo((): ExceptionListTypeEnum => list.type as ExceptionListTypeEnum, [list]);

  const { isLoading, indexPatterns, getExtendedFields } = useFetchIndexPatterns(rules);
  const [isSubmitting, submitEditExceptionItems] = useEditExceptionItems();
  const [isClosingAlerts, closeAlerts] = useCloseAlertsFromExceptions();

  const [
    {
      exceptionItems,
      exceptionItemMeta: { name: exceptionItemName },
      newComment,
      commentErrorExists,
      bulkCloseAlerts,
      disableBulkClose,
      bulkCloseIndex,
      entryErrorExists,
      expireTime,
      expireErrorExists,
    },
    dispatch,
  ] = useReducer(createExceptionItemsReducer(), {
    exceptionItems: [itemToEdit],
    exceptionItemMeta: { name: itemToEdit.name },
    newComment: '',
    commentErrorExists: false,
    bulkCloseAlerts: false,
    disableBulkClose: true,
    bulkCloseIndex: undefined,
    entryErrorExists: false,
    expireTime: itemToEdit.expire_time !== undefined ? moment(itemToEdit.expire_time) : undefined,
    expireErrorExists: false,
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

  const setCommentError = useCallback(
    (errorExists: boolean): void => {
      dispatch({
        type: 'setCommentError',
        errorExists,
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

  const setExpireTime = useCallback(
    (exceptionExpireTime: Moment | undefined): void => {
      dispatch({
        type: 'setExpireTime',
        expireTime: exceptionExpireTime,
      });
    },
    [dispatch]
  );

  const setExpireError = useCallback(
    (errorExists: boolean): void => {
      dispatch({
        type: 'setExpireError',
        errorExists,
      });
    },
    [dispatch]
  );

  const handleCloseFlyout = useCallback((): void => {
    onCancel(false);
  }, [onCancel]);

  const areItemsReadyForUpdate = useCallback(
    (items: ExceptionsBuilderReturnExceptionItem[]): items is ExceptionListItemSchema[] => {
      return items.every((item) => updateExceptionListItemSchema.is(item));
    },
    []
  );

  const handleSubmit = useCallback(async (): Promise<void> => {
    if (submitEditExceptionItems == null) return;

    try {
      const items = enrichExceptionItemsForUpdate({
        itemName: exceptionItemName,
        commentToAdd: newComment,
        listType,
        selectedOs: itemToEdit.os_types,
        expireTime,
        items: exceptionItems,
      });

      if (areItemsReadyForUpdate(items)) {
        await submitEditExceptionItems({
          itemsToUpdate: items,
        });

        const ruleDefaultRule = rule != null ? [rule.rule_id] : [];
        const referencedRules =
          ruleReferences != null
            ? ruleReferences[list.list_id].referenced_rules.map(({ rule_id: ruleId }) => ruleId)
            : [];
        const ruleIdsForBulkClose =
          listType === ExceptionListTypeEnum.RULE_DEFAULT ? ruleDefaultRule : referencedRules;

        if (closeAlerts != null && !isEmpty(ruleIdsForBulkClose) && bulkCloseAlerts) {
          await closeAlerts(ruleIdsForBulkClose, items, undefined, bulkCloseIndex);
        }

        onConfirm(true);
      }
    } catch (e) {
      onCancel(false);
    }
  }, [
    submitEditExceptionItems,
    exceptionItemName,
    newComment,
    listType,
    itemToEdit.os_types,
    exceptionItems,
    areItemsReadyForUpdate,
    rule,
    ruleReferences,
    list.list_id,
    closeAlerts,
    bulkCloseAlerts,
    onConfirm,
    bulkCloseIndex,
    onCancel,
    expireTime,
  ]);

  const editExceptionMessage = useMemo(
    () =>
      listType === ExceptionListTypeEnum.ENDPOINT
        ? i18n.EDIT_ENDPOINT_EXCEPTION_TITLE
        : i18n.EDIT_EXCEPTION_TITLE,
    [listType]
  );

  const isSubmitButtonDisabled = useMemo(
    () =>
      isSubmitting ||
      isClosingAlerts ||
      exceptionItems.every((item) => item.entries.length === 0) ||
      isLoading ||
      entryErrorExists ||
      expireErrorExists ||
      commentErrorExists,
    [
      isLoading,
      entryErrorExists,
      exceptionItems,
      isSubmitting,
      isClosingAlerts,
      expireErrorExists,
      commentErrorExists,
    ]
  );

  return (
    <EuiFlyout size="l" onClose={handleCloseFlyout} data-test-subj="editExceptionFlyout">
      <FlyoutHeader>
        <EuiTitle>
          <h2 data-test-subj="exceptionFlyoutTitle">{editExceptionMessage}</h2>
        </EuiTitle>
        <EuiSpacer size="m" />
      </FlyoutHeader>
      <FlyoutBodySection className="builder-section">
        {isLoading && <EuiSkeletonText data-test-subj="loadingEditExceptionFlyout" lines={4} />}
        <ExceptionsFlyoutMeta
          exceptionItemName={exceptionItemName}
          onChange={setExceptionItemMeta}
        />
        <EuiHorizontalRule />
        <ExceptionsConditions
          exceptionItemName={exceptionItemName}
          allowLargeValueLists={allowLargeValueLists}
          exceptionListItems={[itemToEdit]}
          exceptionListType={listType}
          indexPatterns={indexPatterns}
          rules={rules}
          selectedOs={selectedOs}
          showOsTypeOptions={listType === ExceptionListTypeEnum.ENDPOINT}
          isEdit
          onExceptionItemAdd={setExceptionItemsToAdd}
          onSetErrorExists={setConditionsValidationError}
          getExtendedFields={getExtendedFields}
        />
        {!openedFromListDetailPage && listType === ExceptionListTypeEnum.DETECTION && (
          <>
            <EuiHorizontalRule />
            <ExceptionsLinkedToLists
              isLoadingReferences={isLoadingReferences}
              errorFetchingReferences={referenceFetchError}
              listAndReferences={ruleReferences != null ? [ruleReferences[list.list_id]] : []}
            />
          </>
        )}
        {!openedFromListDetailPage &&
          listType === ExceptionListTypeEnum.RULE_DEFAULT &&
          rule != null && (
            <>
              <EuiHorizontalRule />
              <ExceptionsLinkedToRule rule={rule} />
            </>
          )}
        <EuiHorizontalRule />
        <ExceptionItemComments
          accordionTitle={
            <SectionHeader size="xs">
              <h3>{i18n.COMMENTS_SECTION_TITLE(itemToEdit.comments.length ?? 0)}</h3>
            </SectionHeader>
          }
          exceptionItemComments={itemToEdit.comments}
          newCommentValue={newComment}
          newCommentOnChange={setComment}
          setCommentError={setCommentError}
        />
        {listType !== ExceptionListTypeEnum.ENDPOINT && (
          <>
            <EuiHorizontalRule />
            <ExceptionsExpireTime
              expireTime={expireTime}
              setExpireTime={setExpireTime}
              setExpireError={setExpireError}
            />
          </>
        )}
        {showAlertCloseOptions && (
          <>
            <EuiHorizontalRule />
            <ExceptionItemsFlyoutAlertsActions
              exceptionListType={listType}
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
