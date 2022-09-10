/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef, useState } from 'react';
import type { ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';
import type { ExceptionsBuilderReturnExceptionItem } from '@kbn/securitysolution-list-utils';

import * as i18n from './translations';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import type { AlertData } from '../../utils/types';
import type { Rule } from '../../../../detections/containers/detection_engine/rules/types';
import { useAddOrUpdateException } from '../../logic/use_add_exception';
import { useAddRuleException } from '../../logic/use_add_rule_exception';
import { useCloseAlertsFromExceptions } from '../../logic/use_close_alerts';

export interface AddNewExceptionItemHookProps {
  rules: Rule[] | null;
  itemsToAdd: ExceptionsBuilderReturnExceptionItem[];
  selectedRulesToAddTo: Rule[];
  listType: ExceptionListTypeEnum;
  bulkCloseAlerts: boolean;
  closeSingleAlert: boolean;
  alertData: AlertData | undefined;
  bulkCloseIndex: string[] | undefined;
  addToSharedLists: boolean;
  addToRules: boolean;
}

export type AddNewExceptionItemHookFuncProps = (arg: AddNewExceptionItemHookProps) => Promise<void>;

export type ReturnUseAddNewExceptionItems = [boolean, AddNewExceptionItemHookFuncProps | null];

/**
 * Hook for adding new exception items from flyout
 *
 */
export const useAddNewExceptionItems = (): ReturnUseAddNewExceptionItems => {
  const { addSuccess, addError, addWarning } = useAppToasts();
  const [isClosingAlerts, closeAlerts] = useCloseAlertsFromExceptions();
  const [isAddRuleExceptionLoading, addRuleExceptions] = useAddRuleException();
  const [isAddingExceptions, addSharedExceptions] = useAddOrUpdateException();

  const [isLoading, setIsLoading] = useState(false);
  const addNewExceptionsRef = useRef<AddNewExceptionItemHookFuncProps | null>(null);

  useEffect(() => {
    let isSubscribed = true;
    const abortCtrl = new AbortController();

    const addNewExceptions = async ({
      rules,
      itemsToAdd,
      selectedRulesToAddTo,
      bulkCloseAlerts,
      closeSingleAlert,
      alertData,
      bulkCloseIndex,
      addToRules,
      addToSharedLists,
    }: AddNewExceptionItemHookProps) => {
      try {
        setIsLoading(true);

        if (addToRules && addRuleExceptions != null) {
          // TODO: Update once bulk route is added
          await Promise.all(
            selectedRulesToAddTo.map(async (rule) => {
              await addRuleExceptions(itemsToAdd, rule.id, rule.name);
            })
          );

          if (closeAlerts != null && (bulkCloseAlerts || closeSingleAlert)) {
            const alertIdToClose = closeSingleAlert && alertData ? alertData._id : undefined;
            await Promise.all(
              selectedRulesToAddTo.map(async (rule) =>
                closeAlerts(rule.rule_id, itemsToAdd, alertIdToClose, bulkCloseIndex)
              )
            );
          }
        } else if (addToSharedLists && addSharedExceptions != null) {
          await addSharedExceptions(itemsToAdd);

          if (
            rules != null &&
            rules.length > 0 &&
            closeAlerts != null &&
            (bulkCloseAlerts || closeSingleAlert)
          ) {
            const alertIdToClose = closeSingleAlert && alertData ? alertData._id : undefined;
            await Promise.all(
              rules.map(async (rule) =>
                closeAlerts(rule.rule_id, itemsToAdd, alertIdToClose, bulkCloseIndex)
              )
            );
          }
        }

        if (isSubscribed) {
          setIsLoading(false);
        }
      } catch (e) {
        if (isSubscribed) {
          setIsLoading(false);
          addError(e, { title: i18n.SUBMIT_ERROR_TITLE });
          throw e;
        }
      }
    };

    addNewExceptionsRef.current = addNewExceptions;
    return (): void => {
      isSubscribed = false;
      abortCtrl.abort();
    };
  }, [addSuccess, addError, addWarning, addRuleExceptions, addSharedExceptions, closeAlerts]);

  return [
    isLoading || isClosingAlerts || isAddingExceptions || isAddRuleExceptionLoading,
    addNewExceptionsRef.current,
  ];
};
