/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Mock the services required for reading and writing job data.
jest.mock('../../services/job_service', () => ({
  mlJobService: {
    getJob: () => {
      return {
        job_id: 'farequote_no_by',
        description: 'Overall response time',
        analysis_config: {
          bucket_span: '5m',
          detectors: [
            {
              detector_description: 'mean(responsetime)',
              function: 'mean',
              field_name: 'responsetime',
              detector_index: 0,
            },
            {
              detector_description: 'min(responsetime)',
              function: 'max',
              field_name: 'responsetime',
              detector_index: 1,
              custom_rules: [
                {
                  actions: ['skip_result'],
                  conditions: [
                    {
                      applies_to: 'diff_from_typical',
                      operator: 'lte',
                      value: 123,
                    },
                  ],
                },
              ],
            },
          ],
        },
      };
    },
  },
}));
jest.mock('../../services/ml_api_service', () => 'ml');
jest.mock('../../capabilities/check_capabilities', () => ({
  checkPermission: () => true,
}));

jest.mock('../../../../../../../src/plugins/kibana_react/public', () => ({
  withKibana: (comp) => {
    return comp;
  },
}));

import { shallowWithIntl } from '@kbn/test-jest-helpers';
import React from 'react';

import { RuleEditorFlyout } from './rule_editor_flyout';

const NO_RULE_ANOMALY = {
  jobId: 'farequote_no_by',
  detectorIndex: 0,
  source: {
    function: 'mean',
  },
};

const RULE_ANOMALY = {
  jobId: 'farequote_no_by',
  detectorIndex: 1,
  source: {
    function: 'max',
  },
};

function prepareTest() {
  const setShowFunction = jest.fn(() => {});
  const unsetShowFunction = jest.fn(() => {});

  const requiredProps = {
    setShowFunction,
    unsetShowFunction,
    kibana: {
      services: {
        docLinks: {
          links: {
            ml: {
              customRules: 'jest-metadata-mock-url',
            },
          },
        },
      },
    },
  };

  const component = <RuleEditorFlyout {...requiredProps} />;

  const wrapper = shallowWithIntl(component);

  return { wrapper };
}

describe('RuleEditorFlyout', () => {
  test(`don't render when not opened`, () => {
    const test1 = prepareTest();
    expect(test1.wrapper).toMatchSnapshot();
  });

  test('renders the flyout for creating a rule with conditions only', () => {
    const test2 = prepareTest();
    test2.wrapper.instance().showFlyout(NO_RULE_ANOMALY);
    test2.wrapper.update();
    expect(test2.wrapper).toMatchSnapshot();
  });

  test('renders the flyout after adding a condition to a rule', () => {
    const test3 = prepareTest();
    const instance = test3.wrapper.instance();
    instance.showFlyout(NO_RULE_ANOMALY);
    instance.addCondition();
    test3.wrapper.update();
    expect(test3.wrapper).toMatchSnapshot();
  });

  test('renders the select action component for a detector with a rule', () => {
    const test4 = prepareTest();
    const instance = test4.wrapper.instance();
    instance.showFlyout(RULE_ANOMALY);
    test4.wrapper.update();
    expect(test4.wrapper).toMatchSnapshot();
  });

  test('renders the flyout after setting the rule to edit', () => {
    const test5 = prepareTest();
    const instance = test5.wrapper.instance();
    instance.showFlyout(RULE_ANOMALY);
    instance.setEditRuleIndex(0);
    test5.wrapper.update();
    expect(test5.wrapper).toMatchSnapshot();
  });

  test(`don't render after closing the flyout`, () => {
    const test6 = prepareTest();
    const instance = test6.wrapper.instance();
    instance.showFlyout(RULE_ANOMALY);
    instance.setEditRuleIndex(0);
    instance.closeFlyout();
    test6.wrapper.update();
    expect(test6.wrapper).toMatchSnapshot();
  });
});
