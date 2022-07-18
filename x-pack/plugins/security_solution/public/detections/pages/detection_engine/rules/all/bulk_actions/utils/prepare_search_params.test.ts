/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DryRunResult } from '../use_bulk_actions_dry_run';
import type { FilterOptions } from '../../../../../../containers/detection_engine/rules/types';

import { convertRulesFilterToKQL } from '../../../../../../containers/detection_engine/rules/utils';
import { BulkActionsDryRunErrCode } from '../../../../../../../../common/constants';

import { prepareSearchParams } from './prepare_search_params';

jest.mock('../../../../../../containers/detection_engine/rules/utils', () => ({
  convertRulesFilterToKQL: jest.fn().mockReturnValue('str'),
}));

const mockConvertRulesFilterToKQL = convertRulesFilterToKQL as jest.Mock;

describe('prepareSearchParams', () => {
  test('should remove ids from selectedRuleIds if dryRunResult has failed ids', () => {
    const selectedRuleIds = ['rule:1', 'rule:2', 'rule:3'];
    const dryRunResult: DryRunResult = {
      ruleErrors: [
        {
          message: 'test failure',
          ruleIds: ['rule:2'],
        },
        {
          message: 'test failure N2',
          ruleIds: ['rule:3'],
        },
      ],
    };
    const result = prepareSearchParams({
      selectedRuleIds,
      dryRunResult,
    });

    expect(result.ids).toEqual(['rule:1']);
  });

  test.each([
    [
      BulkActionsDryRunErrCode.MACHINE_LEARNING_INDEX_PATTERN,
      {
        filter: '',
        tags: [],
        showCustomRules: false,
        showElasticRules: false,
        excludeRuleTypes: ['machine_learning'],
      },
    ],
    [
      BulkActionsDryRunErrCode.MACHINE_LEARNING_AUTH,
      {
        filter: '',
        tags: [],
        showCustomRules: false,
        showElasticRules: false,
        excludeRuleTypes: ['machine_learning'],
      },
    ],
    [
      BulkActionsDryRunErrCode.IMMUTABLE,
      {
        filter: '',
        tags: [],
        showCustomRules: true,
        showElasticRules: false,
      },
    ],
    [
      undefined,
      {
        filter: '',
        tags: [],
        showCustomRules: false,
        showElasticRules: false,
      },
    ],
  ])(
    'should call convertRulesFilterToKQL with correct filter if "%s" errorCode present in dryRunResult',
    (errorCode, value) => {
      const filterOptions: FilterOptions = {
        filter: '',
        tags: [],
        showCustomRules: false,
        showElasticRules: false,
      };
      const dryRunResult: DryRunResult = {
        ruleErrors: [
          {
            message: 'test failure',
            errorCode,
            ruleIds: ['rule:2'],
          },
        ],
      };
      const result = prepareSearchParams({
        filterOptions,
        dryRunResult,
      });

      expect(mockConvertRulesFilterToKQL).toHaveBeenCalledWith(value);
      expect(result.query).toEqual(expect.any(String));
    }
  );
});
