/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Mock the mlJobService that is imported for saving rules.
jest.mock('../../services/job_service', () => 'mlJobService');

import { shallowWithIntl } from '@kbn/test-jest-helpers';
import React from 'react';

import { ML_DETECTOR_RULE_APPLIES_TO, ML_DETECTOR_RULE_OPERATOR } from '@kbn/ml-anomaly-utils';

import { ConditionExpression } from './condition_expression';

describe('ConditionExpression', () => {
  const updateCondition = jest.fn(() => {});
  const deleteCondition = jest.fn(() => {});

  const requiredProps = {
    index: 0,
    updateCondition,
    deleteCondition,
  };

  test('renders with only value supplied', () => {
    const props = {
      ...requiredProps,
      value: 123,
    };

    const component = shallowWithIntl(<ConditionExpression {...props} />);

    expect(component).toMatchSnapshot();
  });

  test('renders with appliesTo, operator and value supplied', () => {
    const props = {
      ...requiredProps,
      appliesTo: ML_DETECTOR_RULE_APPLIES_TO.DIFF_FROM_TYPICAL,
      operator: ML_DETECTOR_RULE_OPERATOR.GREATER_THAN,
      value: 123,
    };

    const component = shallowWithIntl(<ConditionExpression {...props} />);

    expect(component).toMatchSnapshot();
  });
});
