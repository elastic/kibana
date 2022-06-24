/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act } from 'react-dom/test-utils';
import { mountWithIntl, nextTick } from '@kbn/test-jest-helpers';
import { RuleStatusPanelWithApi } from './rule_status_panel';
import { mockRule } from './test_helpers';

jest.mock('../../../lib/rule_api/load_execution_log_aggregations', () => ({
  loadExecutionLogAggregations: () => ({ total: 400 }),
}));

describe('rule status panel', () => {
  it('fetches and renders the number of executions in the last 24 hours', async () => {
    const wrapper = mountWithIntl(
      <RuleStatusPanelWithApi
        rule={mockRule()}
        isEditable
        healthColor="primary"
        statusMessage="Ok"
        requestRefresh={jest.fn()}
      />
    );
    await act(async () => {
      await nextTick();
      wrapper.update();
    });
    const ruleExecutionsDescription = wrapper.find(
      '[data-test-subj="ruleStatus-numberOfExecutions"]'
    );
    expect(ruleExecutionsDescription.first().text()).toBe('400 executions in the last 24 hr');
  });
});
