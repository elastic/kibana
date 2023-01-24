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

import { ConditionsSection } from './conditions_section';
import { getNewConditionDefaults } from './utils';
import { APPLIES_TO, OPERATOR } from '../../../../common/constants/detector_rule';

describe('ConditionsSectionExpression', () => {
  const addCondition = jest.fn(() => {});
  const updateCondition = jest.fn(() => {});
  const deleteCondition = jest.fn(() => {});

  const testCondition = {
    applies_to: APPLIES_TO.TYPICAL,
    operator: OPERATOR.GREATER_THAN_OR_EQUAL,
    value: 1.23,
  };

  const requiredProps = {
    addCondition,
    updateCondition,
    deleteCondition,
  };

  test(`don't render when the section is not enabled`, () => {
    const props = {
      ...requiredProps,
      isEnabled: false,
    };

    const component = shallowWithIntl(<ConditionsSection {...props} />);

    expect(component).toMatchSnapshot();
  });

  test('renders when enabled with no conditions supplied', () => {
    const props = {
      ...requiredProps,
      isEnabled: true,
    };

    const component = shallowWithIntl(<ConditionsSection {...props} />);

    expect(component).toMatchSnapshot();
  });

  test('renders when enabled with empty conditions supplied', () => {
    const props = {
      ...requiredProps,
      isEnabled: true,
      conditions: [],
    };

    const component = shallowWithIntl(<ConditionsSection {...props} />);

    expect(component).toMatchSnapshot();
  });

  test('renders when enabled with one condition', () => {
    const props = {
      ...requiredProps,
      isEnabled: true,
      conditions: [getNewConditionDefaults()],
    };

    const component = shallowWithIntl(<ConditionsSection {...props} />);

    expect(component).toMatchSnapshot();
  });

  test('renders when enabled with two conditions', () => {
    const props = {
      ...requiredProps,
      isEnabled: true,
      conditions: [getNewConditionDefaults(), testCondition],
    };

    const component = shallowWithIntl(<ConditionsSection {...props} />);

    expect(component).toMatchSnapshot();
  });

  test(`don't render when not enabled with conditions`, () => {
    const props = {
      ...requiredProps,
      isEnabled: false,
      conditions: [getNewConditionDefaults(), testCondition],
    };

    const component = shallowWithIntl(<ConditionsSection {...props} />);

    expect(component).toMatchSnapshot();
  });
});
