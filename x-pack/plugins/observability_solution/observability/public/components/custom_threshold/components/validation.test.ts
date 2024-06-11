/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import {
  CustomMetricExpressionParams,
  CustomThresholdExpressionMetric,
} from '../../../../common/custom_threshold_rule/types';
import { EQUATION_REGEX, validateCustomThreshold } from './validation';

const errorReason = 'this should appear as error reason';

jest.mock('@kbn/es-query', () => {
  return {
    buildEsQuery: jest.fn(() => {
      // eslint-disable-next-line no-throw-literal
      throw { shortMessage: errorReason };
    }),
  };
});

describe('Metric Threshold Validation', () => {
  describe('valid equations', () => {
    const validExpression = [
      '(A + B) / 100',
      '(A - B) * 100',
      'A > 1 ? A : B',
      'A <= 1 ? A : B',
      'A && B || C',
    ];
    validExpression.forEach((exp) => {
      it(exp, () => {
        expect(exp.match(EQUATION_REGEX)).toBeFalsy();
      });
    });
  });
  describe('invalid equations', () => {
    const validExpression = ['Math.round(A + B) / 100', '(A^2 - B) * 100'];
    validExpression.forEach((exp) => {
      it(exp, () => {
        expect(exp.match(EQUATION_REGEX)).toBeTruthy();
      });
    });
  });
  it('should throw an error when data view is not provided', () => {
    const res = validateCustomThreshold({
      uiSettings: {} as IUiSettingsClient,
      searchConfiguration: {},
      criteria: {
        metrics: [
          {
            name: 'Test',
            aggType: 'count',
            field: 'system.cpu.cores',
            filter: 'none valid filter',
          },
        ] as unknown as CustomThresholdExpressionMetric[],
      } as unknown as CustomMetricExpressionParams[],
    });
    expect(res.errors.searchConfiguration[0]).toBe('Data view is required.');
  });
  it('should throw an error when filter query is not valid with reason', () => {
    const res = validateCustomThreshold({
      uiSettings: {
        get: jest.fn(),
      } as unknown as IUiSettingsClient,
      searchConfiguration: {
        index: 'test*',
        query: {
          language: `kuery`,
          query: 'test:tet',
        },
      },
      criteria: {
        metrics: [
          {
            name: 'Test',
            aggType: 'count',
            field: 'system.cpu.cores',
            filter: 'none valid filter',
          },
        ] as unknown as CustomThresholdExpressionMetric[],
      } as unknown as CustomMetricExpressionParams[],
    });
    expect(res.errors.filterQuery[0]).toBe(`Filter query is invalid. ${errorReason}`);
  });
});
