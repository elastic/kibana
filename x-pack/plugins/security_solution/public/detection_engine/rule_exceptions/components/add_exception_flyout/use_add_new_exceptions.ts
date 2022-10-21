/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import type {
  CreateExceptionListItemSchema,
  CreateRuleExceptionListItemSchema,
  ExceptionListItemSchema,
  ExceptionListSchema,
} from '@kbn/securitysolution-io-ts-list-types';
import {
  createExceptionListItemSchema,
  exceptionListItemSchema,
  ExceptionListTypeEnum,
  createRuleExceptionListItemSchema,
} from '@kbn/securitysolution-io-ts-list-types';
import type { ExceptionsBuilderReturnExceptionItem } from '@kbn/securitysolution-list-utils';

import * as i18n from './translations';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import type { Rule } from '../../../rule_management/logic/types';
import { useCreateOrUpdateException } from '../../logic/use_create_update_exception';
import { useAddRuleDefaultException } from '../../logic/use_add_rule_exception';

export interface AddNewExceptionItemHookProps {
  itemsToAdd: ExceptionsBuilderReturnExceptionItem[];
  listType: ExceptionListTypeEnum;
  selectedRulesToAddTo: Rule[];
  addToSharedLists: boolean;
  addToRules: boolean;
  sharedLists: ExceptionListSchema[];
}

export type AddNewExceptionItemHookFuncProps = (
  arg: AddNewExceptionItemHookProps
) => Promise<ExceptionListItemSchema[]>;

export type ReturnUseAddNewExceptionItems = [boolean, AddNewExceptionItemHookFuncProps | null];

/**
 * Hook for adding new exception items from flyout
 *
 */
export const useAddNewExceptionItems = (): ReturnUseAddNewExceptionItems => {
  const { addSuccess, addError, addWarning } = useAppToasts();
  const [isAddRuleExceptionLoading, addRuleExceptions] = useAddRuleDefaultException();
  const [isAddingExceptions, addSharedExceptions] = useCreateOrUpdateException();

  const [isLoading, setIsLoading] = useState(false);
  const addNewExceptionsRef = useRef<AddNewExceptionItemHookFuncProps | null>(null);

  const areRuleDefaultItems = useCallback(
    (
      items: ExceptionsBuilderReturnExceptionItem[]
    ): items is CreateRuleExceptionListItemSchema[] => {
      return items.every((item) => createRuleExceptionListItemSchema.is(item));
    },
    []
  );

  const areSharedListItems = useCallback(
    (
      items: ExceptionsBuilderReturnExceptionItem[]
    ): items is Array<ExceptionListItemSchema | CreateExceptionListItemSchema> => {
      return items.every(
        (item) => exceptionListItemSchema.is(item) || createExceptionListItemSchema.is(item)
      );
    },
    []
  );

  useEffect(() => {
    const abortCtrl = new AbortController();

    const addNewExceptions = async ({
      itemsToAdd,
      listType,
      selectedRulesToAddTo,
      addToRules,
      addToSharedLists,
      sharedLists,
    }: AddNewExceptionItemHookProps): Promise<ExceptionListItemSchema[]> => {
      try {
        let result: ExceptionListItemSchema[] = [];
        setIsLoading(true);

        if (
          addToRules &&
          addRuleExceptions != null &&
          listType !== ExceptionListTypeEnum.ENDPOINT &&
          areRuleDefaultItems(itemsToAdd)
        ) {
          result = await addRuleExceptions(itemsToAdd, selectedRulesToAddTo);

          const ruleNames = selectedRulesToAddTo.map(({ name }) => name).join(', ');

          addSuccess({
            title: i18n.ADD_RULE_EXCEPTION_SUCCESS_TITLE,
            text: i18n.ADD_RULE_EXCEPTION_SUCCESS_TEXT(ruleNames),
          });
        } else if (
          (listType === ExceptionListTypeEnum.ENDPOINT || addToSharedLists) &&
          addSharedExceptions != null &&
          areSharedListItems(itemsToAdd)
        ) {
          result = await addSharedExceptions(itemsToAdd);

          const sharedListNames = sharedLists.map(({ name }) => name);

          addSuccess({
            title: i18n.ADD_EXCEPTION_SUCCESS,
            text: i18n.ADD_EXCEPTION_SUCCESS_DETAILS(sharedListNames.join(',')),
          });
        }

        setIsLoading(false);

        return result;
      } catch (e) {
        setIsLoading(false);
        addError(e, { title: i18n.SUBMIT_ERROR_TITLE });
        throw e;
      }
    };

    addNewExceptionsRef.current = addNewExceptions;
    return (): void => {
      abortCtrl.abort();
    };
  }, [
    addSuccess,
    addError,
    addWarning,
    addRuleExceptions,
    addSharedExceptions,
    areRuleDefaultItems,
    areSharedListItems,
  ]);

  return [
    isLoading || isAddingExceptions || isAddRuleExceptionLoading,
    addNewExceptionsRef.current,
  ];
};
