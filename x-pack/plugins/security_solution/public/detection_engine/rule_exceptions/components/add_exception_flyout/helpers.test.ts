/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getExceptionListItemSchemaMock } from '@kbn/lists-plugin/common/schemas/response/exception_list_item_schema.mock';
import { getExceptionListSchemaMock } from '@kbn/lists-plugin/common/schemas/response/exception_list_schema.mock';
import { ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';

import { getRulesSchemaMock } from '../../../../../common/api/detection_engine/model/rule_schema/rule_response_schema.mock';
import { isSubmitDisabled, prepareNewItemsForSubmission, prepareToCloseAlerts } from './helpers';
import type { Rule } from '../../../rule_management/logic/types';
import type { AlertData } from '../../utils/types';

const items = [
  {
    ...getExceptionListItemSchemaMock(),
  },
];

const alertDataMock: AlertData = {
  '@timestamp': '1234567890',
  _id: 'test-id',
  file: { path: 'test/path' },
};

describe('add_exception_flyout#helpers', () => {
  describe('isSubmitDisabled', () => {
    it('returns true if "isSubmitting" is "true"', () => {
      expect(
        isSubmitDisabled({
          isSubmitting: true,
          isClosingAlerts: false,
          errorSubmitting: null,
          exceptionItemName: 'Item name',
          exceptionItems: items,
          itemConditionValidationErrorExists: false,
          commentErrorExists: false,
          expireErrorExists: false,
          addExceptionToRadioSelection: 'add_to_lists',
          selectedRulesToAddTo: [],
          listType: ExceptionListTypeEnum.RULE_DEFAULT,
          exceptionListsToAddTo: [getExceptionListSchemaMock()],
        })
      ).toBeTruthy();
    });

    it('returns true if "isClosingAlerts" is "true"', () => {
      expect(
        isSubmitDisabled({
          isSubmitting: false,
          isClosingAlerts: true,
          errorSubmitting: null,
          exceptionItemName: 'Item name',
          exceptionItems: items,
          itemConditionValidationErrorExists: false,
          commentErrorExists: false,
          expireErrorExists: false,
          addExceptionToRadioSelection: 'add_to_lists',
          selectedRulesToAddTo: [],
          listType: ExceptionListTypeEnum.RULE_DEFAULT,
          exceptionListsToAddTo: [getExceptionListSchemaMock()],
        })
      ).toBeTruthy();
    });

    it('returns true if "itemConditionValidationErrorExists" is "true"', () => {
      expect(
        isSubmitDisabled({
          isSubmitting: false,
          isClosingAlerts: false,
          errorSubmitting: null,
          exceptionItemName: 'Item name',
          exceptionItems: items,
          itemConditionValidationErrorExists: true,
          commentErrorExists: false,
          expireErrorExists: false,
          addExceptionToRadioSelection: 'add_to_lists',
          selectedRulesToAddTo: [],
          listType: ExceptionListTypeEnum.RULE_DEFAULT,
          exceptionListsToAddTo: [getExceptionListSchemaMock()],
        })
      ).toBeTruthy();
    });

    it('returns true if "commentErrorExists" is "true"', () => {
      expect(
        isSubmitDisabled({
          isSubmitting: false,
          isClosingAlerts: false,
          errorSubmitting: null,
          exceptionItemName: 'Item name',
          exceptionItems: items,
          itemConditionValidationErrorExists: false,
          commentErrorExists: true,
          expireErrorExists: false,
          addExceptionToRadioSelection: 'add_to_lists',
          selectedRulesToAddTo: [],
          listType: ExceptionListTypeEnum.RULE_DEFAULT,
          exceptionListsToAddTo: [getExceptionListSchemaMock()],
        })
      ).toBeTruthy();
    });

    it('returns true if "expireErrorExists" is "true"', () => {
      expect(
        isSubmitDisabled({
          isSubmitting: false,
          isClosingAlerts: false,
          errorSubmitting: null,
          exceptionItemName: 'Item name',
          exceptionItems: items,
          itemConditionValidationErrorExists: false,
          commentErrorExists: false,
          expireErrorExists: true,
          addExceptionToRadioSelection: 'add_to_lists',
          selectedRulesToAddTo: [],
          listType: ExceptionListTypeEnum.RULE_DEFAULT,
          exceptionListsToAddTo: [getExceptionListSchemaMock()],
        })
      ).toBeTruthy();
    });

    it('returns true if item name is empty', () => {
      expect(
        isSubmitDisabled({
          isSubmitting: false,
          isClosingAlerts: false,
          errorSubmitting: null,
          exceptionItemName: '  ',
          exceptionItems: items,
          itemConditionValidationErrorExists: false,
          commentErrorExists: false,
          expireErrorExists: false,
          addExceptionToRadioSelection: 'add_to_lists',
          selectedRulesToAddTo: [],
          listType: ExceptionListTypeEnum.DETECTION,
          exceptionListsToAddTo: [getExceptionListSchemaMock()],
        })
      ).toBeTruthy();
    });

    it('returns true if error submitting exists', () => {
      expect(
        isSubmitDisabled({
          isSubmitting: false,
          isClosingAlerts: false,
          errorSubmitting: new Error('uh oh'),
          exceptionItemName: 'Item name',
          exceptionItems: items,
          itemConditionValidationErrorExists: false,
          commentErrorExists: false,
          expireErrorExists: false,
          addExceptionToRadioSelection: 'add_to_lists',
          selectedRulesToAddTo: [],
          listType: ExceptionListTypeEnum.DETECTION,
          exceptionListsToAddTo: [getExceptionListSchemaMock()],
        })
      ).toBeTruthy();
    });

    it('returns true if all items do not include any entries', () => {
      expect(
        isSubmitDisabled({
          isSubmitting: false,
          isClosingAlerts: false,
          errorSubmitting: null,
          exceptionItemName: 'Item name',
          exceptionItems: [
            {
              ...getExceptionListItemSchemaMock(),
              entries: [],
            },
          ],
          itemConditionValidationErrorExists: false,
          commentErrorExists: false,
          expireErrorExists: false,
          addExceptionToRadioSelection: 'add_to_lists',
          selectedRulesToAddTo: [],
          listType: ExceptionListTypeEnum.DETECTION,
          exceptionListsToAddTo: [getExceptionListSchemaMock()],
        })
      ).toBeTruthy();
    });

    it('returns true if exception is to be added to a list, but no list is specified', () => {
      expect(
        isSubmitDisabled({
          isSubmitting: false,
          isClosingAlerts: false,
          errorSubmitting: null,
          exceptionItemName: 'Item name',
          exceptionItems: items,
          itemConditionValidationErrorExists: false,
          commentErrorExists: false,
          expireErrorExists: false,
          addExceptionToRadioSelection: 'add_to_lists',
          selectedRulesToAddTo: [],
          listType: ExceptionListTypeEnum.DETECTION,
          exceptionListsToAddTo: [],
        })
      ).toBeTruthy();
    });

    it('returns true if exception is to be added to a rule but no rule is specified', () => {
      expect(
        isSubmitDisabled({
          isSubmitting: false,
          isClosingAlerts: false,
          errorSubmitting: null,
          exceptionItemName: 'Item name',
          exceptionItems: items,
          itemConditionValidationErrorExists: false,
          commentErrorExists: false,
          expireErrorExists: false,
          addExceptionToRadioSelection: 'select_rules_to_add_to',
          selectedRulesToAddTo: [],
          listType: ExceptionListTypeEnum.RULE_DEFAULT,
          exceptionListsToAddTo: [],
        })
      ).toBeTruthy();
    });

    it('returns false if conditions are met for adding exception to a rule', () => {
      expect(
        isSubmitDisabled({
          isSubmitting: false,
          isClosingAlerts: false,
          errorSubmitting: null,
          exceptionItemName: 'Item name',
          exceptionItems: items,
          itemConditionValidationErrorExists: false,
          commentErrorExists: false,
          expireErrorExists: false,
          addExceptionToRadioSelection: 'select_rules_to_add_to',
          selectedRulesToAddTo: [
            {
              ...getRulesSchemaMock(),
              exceptions_list: [],
            } as Rule,
          ],
          listType: ExceptionListTypeEnum.RULE_DEFAULT,
          exceptionListsToAddTo: [],
        })
      ).toBeFalsy();
    });

    it('returns false if conditions are met for adding exception to a list', () => {
      expect(
        isSubmitDisabled({
          isSubmitting: false,
          isClosingAlerts: false,
          errorSubmitting: null,
          exceptionItemName: 'Item name',
          exceptionItems: items,
          itemConditionValidationErrorExists: false,
          commentErrorExists: false,
          expireErrorExists: false,
          addExceptionToRadioSelection: 'add_to_lists',
          selectedRulesToAddTo: [],
          listType: ExceptionListTypeEnum.DETECTION,
          exceptionListsToAddTo: [getExceptionListSchemaMock()],
        })
      ).toBeFalsy();
    });
  });

  // Doesn't explicitly test "enrichNewExceptionItems" used within helper as that function
  // is covered with unit tests itself.
  describe('prepareNewItemsForSubmission', () => {
    it('returns "addToLists" true and the sharedListToAddTo lists to add to if correct radio selection and lists are referenced', () => {
      const { addToRules, addToLists, listsToAddTo } = prepareNewItemsForSubmission({
        sharedListToAddTo: [getExceptionListSchemaMock()],
        addExceptionToRadioSelection: 'add_to_lists',
        exceptionListsToAddTo: [],
        exceptionItemName: 'Test item',
        newComment: '',
        listType: ExceptionListTypeEnum.DETECTION,
        osTypesSelection: [],
        expireTime: undefined,
        exceptionItems: [],
      });

      expect(addToLists).toBeTruthy();
      expect(addToRules).toBeFalsy();
      expect(listsToAddTo).toEqual([getExceptionListSchemaMock()]);
    });

    it('returns "addToLists" true and the exceptionListsToAddTo if correct radio selection and lists are referenced', () => {
      const { addToRules, addToLists, listsToAddTo } = prepareNewItemsForSubmission({
        sharedListToAddTo: [],
        addExceptionToRadioSelection: 'add_to_lists',
        exceptionListsToAddTo: [getExceptionListSchemaMock()],
        exceptionItemName: 'Test item',
        newComment: '',
        listType: ExceptionListTypeEnum.DETECTION,
        osTypesSelection: [],
        expireTime: undefined,
        exceptionItems: [],
      });

      expect(addToLists).toBeTruthy();
      expect(addToRules).toBeFalsy();
      expect(listsToAddTo).toEqual([getExceptionListSchemaMock()]);
    });

    it('returns "addToLists" false if no exception lists are specified as the lists to add to', () => {
      const { addToRules, addToLists, listsToAddTo } = prepareNewItemsForSubmission({
        sharedListToAddTo: [],
        addExceptionToRadioSelection: 'add_to_lists',
        exceptionListsToAddTo: [],
        exceptionItemName: 'Test item',
        newComment: '',
        listType: ExceptionListTypeEnum.DETECTION,
        osTypesSelection: [],
        expireTime: undefined,
        exceptionItems: [],
      });

      expect(addToLists).toBeFalsy();
      expect(addToRules).toBeFalsy();
      expect(listsToAddTo).toEqual([]);
    });

    it('returns "addToRules" true if radio selection is "add_to_rule"', () => {
      const { addToRules, addToLists, listsToAddTo } = prepareNewItemsForSubmission({
        sharedListToAddTo: [],
        addExceptionToRadioSelection: 'add_to_rule',
        exceptionListsToAddTo: [],
        exceptionItemName: 'Test item',
        newComment: '',
        listType: ExceptionListTypeEnum.DETECTION,
        osTypesSelection: [],
        expireTime: undefined,
        exceptionItems: [],
      });

      expect(addToLists).toBeFalsy();
      expect(addToRules).toBeTruthy();
      expect(listsToAddTo).toEqual([]);
    });

    it('returns "addToRules" true if radio selection is "add_to_rules"', () => {
      const { addToRules, addToLists, listsToAddTo } = prepareNewItemsForSubmission({
        sharedListToAddTo: [],
        addExceptionToRadioSelection: 'add_to_rules',
        exceptionListsToAddTo: [],
        exceptionItemName: 'Test item',
        newComment: '',
        listType: ExceptionListTypeEnum.DETECTION,
        osTypesSelection: [],
        expireTime: undefined,
        exceptionItems: [],
      });

      expect(addToLists).toBeFalsy();
      expect(addToRules).toBeTruthy();
      expect(listsToAddTo).toEqual([]);
    });

    it('returns "addToRules" true if radio selection is "select_rules_to_add_to"', () => {
      const { addToRules, addToLists, listsToAddTo } = prepareNewItemsForSubmission({
        sharedListToAddTo: [],
        addExceptionToRadioSelection: 'select_rules_to_add_to',
        exceptionListsToAddTo: [],
        exceptionItemName: 'Test item',
        newComment: '',
        listType: ExceptionListTypeEnum.DETECTION,
        osTypesSelection: [],
        expireTime: undefined,
        exceptionItems: [],
      });

      expect(addToLists).toBeFalsy();
      expect(addToRules).toBeTruthy();
      expect(listsToAddTo).toEqual([]);
    });
  });

  describe('prepareToCloseAlerts', () => {
    it('returns "shouldCloseAlerts" false if no rule ids defined', () => {
      const { shouldCloseAlerts, ruleStaticIds } = prepareToCloseAlerts({
        alertData: undefined,
        closeSingleAlert: false,
        addToRules: true,
        rules: [],
        bulkCloseAlerts: true,
        selectedRulesToAddTo: [],
      });

      expect(shouldCloseAlerts).toBeFalsy();
      expect(ruleStaticIds).toEqual([]);
    });

    it('returns "shouldCloseAlerts" false if neither closeSingleAlert or bulkCloseAlerts are true', () => {
      const { shouldCloseAlerts, ruleStaticIds } = prepareToCloseAlerts({
        alertData: undefined,
        closeSingleAlert: false,
        addToRules: true,
        rules: [],
        bulkCloseAlerts: false,
        selectedRulesToAddTo: [
          {
            ...getRulesSchemaMock(),
            exceptions_list: [],
          } as Rule,
        ],
      });

      expect(shouldCloseAlerts).toBeFalsy();
      expect(ruleStaticIds).toEqual(['query-rule-id']);
    });

    it('returns "alertIdToClose" if "alertData" defined and "closeSingleAlert" selected', () => {
      const { alertIdToClose, ruleStaticIds } = prepareToCloseAlerts({
        alertData: alertDataMock,
        closeSingleAlert: true,
        addToRules: true,
        rules: [],
        bulkCloseAlerts: false,
        selectedRulesToAddTo: [
          {
            ...getRulesSchemaMock(),
            exceptions_list: [],
          } as Rule,
        ],
      });

      expect(alertIdToClose).toEqual('test-id');
      expect(ruleStaticIds).toEqual(['query-rule-id']);
    });

    it('returns "alertIdToClose" of undefined if "alertData" defined but "closeSingleAlert" is not selected', () => {
      const { alertIdToClose, ruleStaticIds } = prepareToCloseAlerts({
        alertData: alertDataMock,
        closeSingleAlert: false,
        addToRules: true,
        rules: [],
        bulkCloseAlerts: false,
        selectedRulesToAddTo: [
          {
            ...getRulesSchemaMock(),
            exceptions_list: [],
          } as Rule,
        ],
      });

      expect(alertIdToClose).toBeUndefined();
      expect(ruleStaticIds).toEqual(['query-rule-id']);
    });

    it('returns rule ids from "rules" if "addToRules" is false', () => {
      const { ruleStaticIds } = prepareToCloseAlerts({
        alertData: alertDataMock,
        closeSingleAlert: false,
        addToRules: false,
        rules: [
          {
            ...getRulesSchemaMock(),
            exceptions_list: [],
          } as Rule,
        ],
        bulkCloseAlerts: false,
        selectedRulesToAddTo: [],
      });

      expect(ruleStaticIds).toEqual(['query-rule-id']);
    });
  });
});
