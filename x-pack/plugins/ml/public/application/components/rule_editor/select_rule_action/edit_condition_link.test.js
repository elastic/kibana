/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('../../../services/job_service', () => 'mlJobService');

import React from 'react';

import { shallowWithIntl } from '@kbn/test-jest-helpers';
import { ML_DETECTOR_RULE_APPLIES_TO } from '@kbn/ml-anomaly-utils';

import { EditConditionLink } from './edit_condition_link';

function prepareTest(updateConditionValueFn, appliesTo) {
  const anomaly = {
    actual: [210],
    typical: [1.23],
    detectorIndex: 0,
    source: {
      function: 'mean',
      airline: ['AAL'],
    },
  };

  const props = {
    conditionIndex: 0,
    conditionValue: 5,
    appliesTo,
    anomaly,
    updateConditionValue: updateConditionValueFn,
  };

  const wrapper = shallowWithIntl(<EditConditionLink {...props} />);

  return wrapper;
}

describe('EditConditionLink', () => {
  const updateConditionValue = jest.fn(() => {});

  test(`renders for a condition using actual`, () => {
    const wrapper = prepareTest(updateConditionValue, ML_DETECTOR_RULE_APPLIES_TO.ACTUAL);
    expect(wrapper).toMatchSnapshot();
  });

  test(`renders for a condition using typical`, () => {
    const wrapper = prepareTest(updateConditionValue, ML_DETECTOR_RULE_APPLIES_TO.TYPICAL);
    expect(wrapper).toMatchSnapshot();
  });

  test(`renders for a condition using diff from typical`, () => {
    const wrapper = prepareTest(
      updateConditionValue,
      ML_DETECTOR_RULE_APPLIES_TO.DIFF_FROM_TYPICAL
    );
    expect(wrapper).toMatchSnapshot();
  });

  test('calls updateConditionValue on clicking update link', () => {
    const wrapper = prepareTest(updateConditionValue, ML_DETECTOR_RULE_APPLIES_TO.ACTUAL);
    const instance = wrapper.instance();
    instance.onUpdateClick();
    wrapper.update();
    expect(updateConditionValue).toHaveBeenCalledWith(0, 210);
  });
});
