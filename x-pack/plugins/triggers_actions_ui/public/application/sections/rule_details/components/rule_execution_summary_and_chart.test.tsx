/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act } from 'react-dom/test-utils';
import { mountWithIntl, nextTick } from '@kbn/test-jest-helpers';
import { ActionGroup, ALERTS_FEATURE_ID } from '@kbn/alerting-plugin/common';
import { RuleExecutionSummaryAndChart } from './rule_execution_summary_and_chart';
import { useKibana } from '../../../../common/lib/kibana';
import { mockRule, mockRuleType, mockRuleSummary } from './test_helpers';
import { RuleType } from '../../../../types';

const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;
jest.mock('../../../../common/lib/kibana');

const loadRuleSummaryMock = jest.fn();

const onChangeDurationMock = jest.fn();

const ruleMock = mockRule();

const authorizedConsumers = {
  [ALERTS_FEATURE_ID]: { read: true, all: true },
};

const recoveryActionGroup: ActionGroup<'recovered'> = { id: 'recovered', name: 'Recovered' };

const ruleType: RuleType = mockRuleType({
  producer: ALERTS_FEATURE_ID,
  authorizedConsumers,
  recoveryActionGroup,
});

describe('rule_execution_summary_and_chart', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    loadRuleSummaryMock.mockResolvedValue(mockRuleSummary());
  });

  it('becomes a stateless component when "fetchRuleSummary" is false', async () => {
    const wrapper = mountWithIntl(
      <RuleExecutionSummaryAndChart
        ruleId={ruleMock.id}
        ruleType={ruleType}
        ruleSummary={mockRuleSummary()}
        numberOfExecutions={60}
        isLoadingRuleSummary={false}
        onChangeDuration={onChangeDurationMock}
        fetchRuleSummary={false}
        loadRuleSummary={loadRuleSummaryMock}
      />
    );

    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    // Does not fetch for the rule summary by itself
    expect(loadRuleSummaryMock).toHaveBeenCalledTimes(0);

    (
      wrapper
        .find('[data-test-subj="executionDurationChartPanelSelect"]')
        .first()
        .prop('onChange') as any
    )({
      target: {
        value: 30,
      },
    });

    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    // Calls the handler passed in via props
    expect(onChangeDurationMock).toHaveBeenCalledWith(30);

    const avgExecutionDurationPanel = wrapper.find('[data-test-subj="avgExecutionDurationPanel"]');
    expect(avgExecutionDurationPanel.exists()).toBeTruthy();
    expect(avgExecutionDurationPanel.first().prop('color')).toEqual('subdued');
    expect(wrapper.find('EuiStat[data-test-subj="avgExecutionDurationStat"]').text()).toEqual(
      'Average duration00:00:00.100'
    );
    expect(wrapper.find('[data-test-subj="ruleDurationWarning"]').exists()).toBeFalsy();

    expect(wrapper.find('[data-test-subj="executionDurationChartPanel"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="avgExecutionDurationPanel"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="ruleEventLogListAvgDuration"]').first().text()).toEqual(
      '00:00:00.100'
    );
  });

  it('becomes a container component when "fetchRuleSummary" is true', async () => {
    const wrapper = mountWithIntl(
      <RuleExecutionSummaryAndChart
        ruleId={ruleMock.id}
        ruleType={ruleType}
        fetchRuleSummary={true}
        loadRuleSummary={loadRuleSummaryMock}
      />
    );

    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    // Does not fetch for the rule summary by itself
    expect(loadRuleSummaryMock).toHaveBeenCalledTimes(1);

    (
      wrapper
        .find('[data-test-subj="executionDurationChartPanelSelect"]')
        .first()
        .prop('onChange') as any
    )({
      target: {
        value: 30,
      },
    });

    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    // Calls the handler passed in via props
    expect(onChangeDurationMock).toHaveBeenCalledTimes(0);

    const avgExecutionDurationPanel = wrapper.find('[data-test-subj="avgExecutionDurationPanel"]');
    expect(avgExecutionDurationPanel.exists()).toBeTruthy();
    expect(avgExecutionDurationPanel.first().prop('color')).toEqual('subdued');
    expect(wrapper.find('EuiStat[data-test-subj="avgExecutionDurationStat"]').text()).toEqual(
      'Average duration00:00:00.100'
    );
    expect(wrapper.find('[data-test-subj="ruleDurationWarning"]').exists()).toBeFalsy();

    expect(wrapper.find('[data-test-subj="executionDurationChartPanel"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="avgExecutionDurationPanel"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="ruleEventLogListAvgDuration"]').first().text()).toEqual(
      '00:00:00.100'
    );
  });

  it('should show error if loadRuleSummary fails', async () => {
    loadRuleSummaryMock.mockRejectedValue('error!');

    const wrapper = mountWithIntl(
      <RuleExecutionSummaryAndChart
        ruleId={ruleMock.id}
        ruleType={ruleType}
        fetchRuleSummary={true}
        loadRuleSummary={loadRuleSummaryMock}
      />
    );

    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    expect(useKibanaMock().services.notifications.toasts.addDanger).toHaveBeenCalled();
  });
});
