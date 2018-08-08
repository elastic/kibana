/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

jest.mock('../../../services/job_service.js', () => 'mlJobService');

import { shallow } from 'enzyme';
import React from 'react';

import { RuleActionPanel } from './rule_action_panel';
import { ACTION } from '../../../../common/constants/detector_rule';

describe('RuleActionPanel', () => {

  const job = {
    job_id: 'farequote',
    analysis_config: {
      detectors: [
        {
          detector_description: 'mean response time',
          custom_rules: [
            {
              actions: [
                ACTION.SKIP_RESULT
              ],
              conditions: [
                {
                  applies_to: 'actual',
                  operator: 'lt',
                  value: 1
                }
              ]
            },
            {
              actions: [
                ACTION.SKIP_MODEL_UPDATE
              ],
              scope: {
                instance: {
                  filter_id: 'eu-airlines',
                  filter_type: 'exclude'
                }
              }
            },
            {
              actions: [
                ACTION.SKIP_MODEL_UPDATE
              ],
              scope: {
                instance: {
                  filter_id: 'eu-airlines',
                  filter_type: 'exclude'
                }
              },
              conditions: [
                {
                  applies_to: 'actual',
                  operator: 'gt',
                  value: 500
                }
              ]
            },
          ],
          detector_index: 0
        }
      ]
    },
  };

  test('renders panel for rule with a condition', () => {

    const component = shallow(
      <RuleActionPanel
        job={job}
        detectorIndex={0}
        ruleIndex={0}
        setEditRuleIndex={() => {}}
        deleteRuleAtIndex={() => {}}
      />
    );

    expect(component).toMatchSnapshot();

  });

  test('renders panel for rule with scope ', () => {

    const component = shallow(
      <RuleActionPanel
        job={job}
        detectorIndex={0}
        ruleIndex={1}
        setEditRuleIndex={() => {}}
        deleteRuleAtIndex={() => {}}
      />
    );

    expect(component).toMatchSnapshot();

  });

  test('renders panel for rule with a condition and scope ', () => {

    const component = shallow(
      <RuleActionPanel
        job={job}
        detectorIndex={0}
        ruleIndex={2}
        setEditRuleIndex={() => {}}
        deleteRuleAtIndex={() => {}}
      />
    );

    expect(component).toMatchSnapshot();

  });

});
