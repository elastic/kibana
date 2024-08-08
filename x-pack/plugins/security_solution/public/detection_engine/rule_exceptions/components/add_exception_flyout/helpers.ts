/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Moment } from 'moment';
import type { ExceptionListSchema, OsTypeArray } from '@kbn/securitysolution-io-ts-list-types';
import { ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';
import { isEmpty } from 'lodash/fp';
import type { ExceptionsBuilderReturnExceptionItem } from '@kbn/securitysolution-list-utils';

import type { Rule } from '../../../rule_management/logic/types';
import { enrichNewExceptionItems } from '../flyout_components/utils';
import type { AlertData } from '../../utils/types';

const RULE_DEFAULT_OPTIONS = ['add_to_rule', 'add_to_rules', 'select_rules_to_add_to'];

/**
 * Determines whether add exception flyout submit button
 * should be disabled.
 * @param isSubmitting Is submition completed
 * @param isClosingAlerts Waiting on close alerts actions to complete
 * @param errorSubmitting Any submission errors
 * @param exceptionItemName Item name
 * @param exceptionItems Items to be created
 * @param itemConditionValidationErrorExists Item conditions are invalid
 * @param commentErrorExists Comment invalid or errors exist
 * @param expireErrorExists Expire time invalid or error exists
 * @param addExceptionToRadioSelection Radio selection value denoting whether to add item to lists or rules
 * @param selectedRulesToAddTo List of rules item/s should be added to
 * @param listType list type of the item being added
 * @param exceptionListsToAddTo User selected exception lists to add item to
 */
export const isSubmitDisabled = ({
  isSubmitting,
  isClosingAlerts,
  errorSubmitting,
  exceptionItemName,
  exceptionItems,
  itemConditionValidationErrorExists,
  commentErrorExists,
  expireErrorExists,
  addExceptionToRadioSelection,
  selectedRulesToAddTo,
  listType,
  exceptionListsToAddTo,
}: {
  isSubmitting: boolean;
  isClosingAlerts: boolean;
  errorSubmitting: Error | null;
  exceptionItemName: string;
  exceptionItems: ExceptionsBuilderReturnExceptionItem[];
  itemConditionValidationErrorExists: boolean;
  commentErrorExists: boolean;
  expireErrorExists: boolean;
  addExceptionToRadioSelection: string;
  selectedRulesToAddTo: Rule[];
  listType: ExceptionListTypeEnum;
  exceptionListsToAddTo: ExceptionListSchema[];
}): boolean => {
  return (
    isSubmitting ||
    isClosingAlerts ||
    errorSubmitting != null ||
    exceptionItemName.trim() === '' ||
    exceptionItems.every((item) => item.entries.length === 0) ||
    itemConditionValidationErrorExists ||
    commentErrorExists ||
    expireErrorExists ||
    (addExceptionToRadioSelection === 'add_to_lists' && isEmpty(exceptionListsToAddTo)) ||
    (addExceptionToRadioSelection === 'select_rules_to_add_to' &&
      isEmpty(selectedRulesToAddTo) &&
      listType === ExceptionListTypeEnum.RULE_DEFAULT)
  );
};

/**
 * Helper method for determining if user has selected to add exception
 * items to specific rules or to exception lists. It also returns the
 * exception items enriched with various flyout values.
 * @param sharedListToAddTo Exception list passed into add exception item flyout component
 * @param addExceptionToRadioSelection Radio selection value denoting whether to add item to lists or rules
 * @param exceptionListsToAddTo User selected exception lists to add item to
 * @param exceptionItemName Item name
 * @param newComment User added comment
 * @param listType list type of the item being added
 * @param osTypesSelection For endpoint exceptions, OS selected
 * @param expireTime User defined item expire time
 * @param exceptionItems Items to be added
 */
export const prepareNewItemsForSubmission = ({
  sharedListToAddTo,
  addExceptionToRadioSelection,
  exceptionListsToAddTo,
  exceptionItemName,
  newComment,
  listType,
  osTypesSelection,
  expireTime,
  exceptionItems,
}: {
  sharedListToAddTo: ExceptionListSchema[] | undefined;
  addExceptionToRadioSelection: string;
  exceptionListsToAddTo: ExceptionListSchema[];
  exceptionItemName: string;
  newComment: string;
  listType: ExceptionListTypeEnum;
  osTypesSelection: OsTypeArray;
  expireTime: Moment | undefined;
  exceptionItems: ExceptionsBuilderReturnExceptionItem[];
}): {
  listsToAddTo: ExceptionListSchema[];
  addToLists: boolean;
  addToRules: boolean;
  items: ExceptionsBuilderReturnExceptionItem[];
} => {
  const addToRules = RULE_DEFAULT_OPTIONS.includes(addExceptionToRadioSelection);
  const addToLists =
    !!sharedListToAddTo?.length ||
    (addExceptionToRadioSelection === 'add_to_lists' && !isEmpty(exceptionListsToAddTo));
  const listsToAddTo = sharedListToAddTo?.length ? sharedListToAddTo : exceptionListsToAddTo;

  const items = enrichNewExceptionItems({
    itemName: exceptionItemName,
    commentToAdd: newComment,
    addToRules,
    addToSharedLists: addToLists,
    sharedLists: listsToAddTo,
    listType,
    selectedOs: osTypesSelection,
    expireTime,
    items: exceptionItems,
  });

  return {
    listsToAddTo,
    addToLists,
    addToRules,
    items,
  };
};

/**
 * Determine whether to close a single alert or bulk close
 * alerts. Depending on the selection, need to know alert id
 * and rule ids.
 * @param alertData Alert the item is being added to
 * @param closeSingleAlert User selected to close a single alert
 * @param addToRules User selected to add item to 'x' rules
 * @param rules Rules to determine which alerts to target when bulk closing
 * @param bulkCloseAlerts User selected to close all alerts matching new exception
 * @param selectedRulesToAddTo User selected rules to add item to
 */
export const prepareToCloseAlerts = ({
  alertData,
  closeSingleAlert,
  addToRules,
  rules,
  bulkCloseAlerts,
  selectedRulesToAddTo,
}: {
  alertData: AlertData | undefined;
  closeSingleAlert: boolean;
  addToRules: boolean;
  rules: Rule[] | null;
  bulkCloseAlerts: boolean;
  selectedRulesToAddTo: Rule[];
}): {
  shouldCloseAlerts: boolean;
  alertIdToClose: string | undefined;
  ruleStaticIds: string[];
} => {
  const alertIdToClose = closeSingleAlert && alertData ? alertData._id : undefined;
  const ruleStaticIds = addToRules
    ? selectedRulesToAddTo.map(({ rule_id: ruleId }) => ruleId)
    : (rules ?? []).map(({ rule_id: ruleId }) => ruleId);

  return {
    shouldCloseAlerts: !isEmpty(ruleStaticIds) && (bulkCloseAlerts || closeSingleAlert),
    alertIdToClose,
    ruleStaticIds,
  };
};
