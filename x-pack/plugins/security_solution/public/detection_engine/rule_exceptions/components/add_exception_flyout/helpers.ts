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

const RULE_DEFAULT_OPTIONS = ['add_to_rule', 'add_to_rules', 'select_rules_to_add_to'];

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

export const prepareNewItemsForSubmition = ({
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
  sharedLists: ExceptionListSchema[];
  addToSharedLists: boolean;
  addToRules: boolean;
  items: ExceptionsBuilderReturnExceptionItem[];
} => {
  const addToRules = RULE_DEFAULT_OPTIONS.includes(addExceptionToRadioSelection);
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
    expireTime,
    items: exceptionItems,
  });

  return {
    sharedLists,
    addToSharedLists,
    addToRules,
    items,
  };
};

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
}) => {
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
