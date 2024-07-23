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
import { isSubmitDisabled } from './helpers';
import type { Rule } from '../../../rule_management/logic/types';

const items = [
  {
    ...getExceptionListItemSchemaMock(),
  },
];

describe('add_exception_flyout#helpers', () => {
  describe('isSubmitDisabled', () => {
    it('should be true if "isSubmitting" is "true"', () => {
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

    it('should be true if "isClosingAlerts" is "true"', () => {
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

    it('should be true if "itemConditionValidationErrorExists" is "true"', () => {
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

    it('should be true if "commentErrorExists" is "true"', () => {
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

    it('should be true if "expireErrorExists" is "true"', () => {
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

    it('should be true if item name is empty', () => {
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

    it('should be true if error submitting exists', () => {
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

    it('should be true if all items do not include any entries', () => {
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

    it('should be true if exception is to be added to a list, but no list is specified', () => {
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

    it('should be true if exception is to be added to a rule but no rule is specified', () => {
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

    it('should be false if conditions are met for adding exception to a rule', () => {
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

    it('should be false if conditions are met for adding exception to a list', () => {
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
});
