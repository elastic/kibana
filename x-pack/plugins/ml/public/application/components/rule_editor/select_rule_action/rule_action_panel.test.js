/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';

import { createKibanaReactContext } from '@kbn/kibana-react-plugin/public';
import { ML_DETECTOR_RULE_ACTION } from '@kbn/ml-anomaly-utils';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';

import { RuleActionPanel } from './rule_action_panel';

jest.mock('../../../services/job_service', () => 'mlJobService');

// Mock the call for loading a filter.
// The mock is hoisted to the top, so need to prefix the filter variable
// with 'mock' so it can be used lazily.
const mockTestFilter = {
  filter_id: 'eu-airlines',
  description: 'List of European airlines',
  items: ['ABA', 'AEL'],
  used_by: {
    detectors: ['mean response time'],
    jobs: ['farequote'],
  },
};

const kibanaReactContextMock = createKibanaReactContext({
  mlServices: {
    mlApi: {
      filters: {
        filters: () => {
          return Promise.resolve(mockTestFilter);
        },
      },
    },
  },
});

describe('RuleActionPanel', () => {
  const job = {
    job_id: 'farequote',
    analysis_config: {
      detectors: [
        {
          detector_description: 'mean response time',
          custom_rules: [
            {
              actions: [ML_DETECTOR_RULE_ACTION.SKIP_RESULT],
              conditions: [
                {
                  applies_to: 'actual',
                  operator: 'lt',
                  value: 1,
                },
              ],
            },
            {
              actions: [ML_DETECTOR_RULE_ACTION.SKIP_MODEL_UPDATE],
              scope: {
                airline: {
                  filter_id: 'eu-airlines',
                  filter_type: 'exclude',
                },
              },
            },
            {
              actions: [ML_DETECTOR_RULE_ACTION.SKIP_MODEL_UPDATE],
              scope: {
                airline: {
                  filter_id: 'eu-airlines',
                  filter_type: 'exclude',
                },
              },
              conditions: [
                {
                  applies_to: 'actual',
                  operator: 'gt',
                  value: 500,
                },
              ],
            },
          ],
          detector_index: 0,
        },
      ],
    },
  };

  const anomaly = {
    actual: [50],
    typical: [1.23],
    detectorIndex: 0,
    source: {
      function: 'mean',
      airline: ['AAL'],
    },
  };

  const setEditRuleIndex = jest.fn(() => {});
  const updateRuleAtIndex = jest.fn(() => {});
  const deleteRuleAtIndex = jest.fn(() => {});
  const addItemToFilterList = jest.fn(() => {});

  const requiredProps = {
    job,
    anomaly,
    detectorIndex: 0,
    setEditRuleIndex,
    updateRuleAtIndex,
    deleteRuleAtIndex,
    addItemToFilterList,
  };

  test('renders panel for rule with a condition', () => {
    const props = {
      ...requiredProps,
      ruleIndex: 0,
    };

    render(
      <IntlProvider>
        <kibanaReactContextMock.Provider>
          <RuleActionPanel {...props} />
        </kibanaReactContextMock.Provider>
      </IntlProvider>
    );

    expect(screen.getByText('Rule')).toBeInTheDocument();
    expect(screen.getByText('skip result when actual is less than 1')).toBeInTheDocument();
    expect(screen.getByText('Actions')).toBeInTheDocument();
    expect(screen.getByText('Update rule condition from 1 to')).toBeInTheDocument();
    expect(screen.getByText('Update')).toBeInTheDocument();
    expect(screen.getByText('Edit rule')).toBeInTheDocument();
    expect(screen.getByText('Delete rule')).toBeInTheDocument();
  });

  test('renders panel for rule with scope, value in filter list', () => {
    const props = {
      ...requiredProps,
      ruleIndex: 1,
    };

    render(
      <IntlProvider>
        <kibanaReactContextMock.Provider>
          <RuleActionPanel {...props} />
        </kibanaReactContextMock.Provider>
      </IntlProvider>
    );

    expect(screen.getByText('Rule')).toBeInTheDocument();
    expect(
      screen.getByText('skip model update when airline is not in eu-airlines')
    ).toBeInTheDocument();
    expect(screen.getByText('Actions')).toBeInTheDocument();
    expect(screen.getByText('Edit rule')).toBeInTheDocument();
    expect(screen.getByText('Delete rule')).toBeInTheDocument();
  });

  test('renders panel for rule with a condition and scope, value not in filter list', async () => {
    const props = {
      ...requiredProps,
      ruleIndex: 1,
    };

    await waitFor(() => {
      render(
        <IntlProvider>
          <kibanaReactContextMock.Provider>
            <RuleActionPanel {...props} />
          </kibanaReactContextMock.Provider>
        </IntlProvider>
      );
    });

    expect(screen.getByText('Rule')).toBeInTheDocument();
    expect(
      screen.getByText('skip model update when airline is not in eu-airlines')
    ).toBeInTheDocument();
    expect(screen.getByText('Actions')).toBeInTheDocument();
    expect(screen.getByText('Add AAL to eu-airlines')).toBeInTheDocument();
    expect(screen.getByText('Edit rule')).toBeInTheDocument();
    expect(screen.getByText('Delete rule')).toBeInTheDocument();
  });
});
