/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act } from 'react-dom/test-utils';
import { mountWithIntl, nextTick } from '@kbn/test-jest-helpers';
import RuleStatusPanelWithApi, { RuleStatusPanel } from './rule_status_panel';
import { mockRule } from './test_helpers';

jest.mock('../../../lib/rule_api/load_execution_log_aggregations', () => ({
  loadExecutionLogAggregations: () => ({ total: 400 }),
}));
jest.mock('../../../../common/lib/kibana', () => ({
  useKibana: () => ({
    services: {
      notifications: {
        toasts: {
          addSuccess: jest.fn(),
          addDanger: jest.fn(),
        },
      },
    },
  }),
}));

const mockAPIs = {
  enableRule: jest.fn(),
  disableRule: jest.fn(),
  snoozeRule: jest.fn(),
  unsnoozeRule: jest.fn(),
  loadExecutionLogAggregations: jest.fn(),
};
const requestRefresh = jest.fn();

describe('rule status panel', () => {
  it('fetches and renders the number of executions in the last 24 hours', async () => {
    const rule = mockRule();
    const wrapper = mountWithIntl(
      <RuleStatusPanelWithApi
        rule={rule}
        isEditable
        healthColor="primary"
        statusMessage="Ok"
        requestRefresh={requestRefresh}
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
  it('should disable the rule when picking disable in the dropdown', async () => {
    const rule = mockRule({ enabled: true });
    const disableRule = jest.fn();
    const wrapper = mountWithIntl(
      <RuleStatusPanel
        {...mockAPIs}
        rule={rule}
        isEditable
        healthColor="primary"
        statusMessage="Ok"
        requestRefresh={requestRefresh}
        disableRule={disableRule}
      />
    );
    const actionsElem = wrapper
      .find('[data-test-subj="statusDropdown"] .euiBadge__childButton')
      .first();
    actionsElem.simulate('click');

    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    await act(async () => {
      const actionsMenuElem = wrapper.find('[data-test-subj="ruleStatusMenu"]');
      const actionsMenuItemElem = actionsMenuElem.first().find('.euiContextMenuItem');
      actionsMenuItemElem.at(1).simulate('click');
      await nextTick();
    });

    expect(disableRule).toHaveBeenCalledTimes(1);
  });

  it('if rule is already disabled should do nothing when picking disable in the dropdown', async () => {
    const rule = mockRule({ enabled: false });
    const disableRule = jest.fn();
    const wrapper = mountWithIntl(
      <RuleStatusPanel
        {...mockAPIs}
        rule={rule}
        isEditable
        healthColor="primary"
        statusMessage="Ok"
        requestRefresh={requestRefresh}
        disableRule={disableRule}
      />
    );
    const actionsElem = wrapper
      .find('[data-test-subj="statusDropdown"] .euiBadge__childButton')
      .first();
    actionsElem.simulate('click');

    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    await act(async () => {
      const actionsMenuElem = wrapper.find('[data-test-subj="ruleStatusMenu"]');
      const actionsMenuItemElem = actionsMenuElem.first().find('.euiContextMenuItem');
      actionsMenuItemElem.at(1).simulate('click');
      await nextTick();
    });

    expect(disableRule).toHaveBeenCalledTimes(0);
  });

  it('should enable the rule when picking enable in the dropdown', async () => {
    const rule = mockRule({ enabled: false });
    const enableRule = jest.fn();
    const wrapper = mountWithIntl(
      <RuleStatusPanel
        {...mockAPIs}
        rule={rule}
        isEditable
        healthColor="primary"
        statusMessage="Ok"
        requestRefresh={requestRefresh}
        enableRule={enableRule}
      />
    );
    const actionsElem = wrapper
      .find('[data-test-subj="statusDropdown"] .euiBadge__childButton')
      .first();
    actionsElem.simulate('click');

    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    await act(async () => {
      const actionsMenuElem = wrapper.find('[data-test-subj="ruleStatusMenu"]');
      const actionsMenuItemElem = actionsMenuElem.first().find('.euiContextMenuItem');
      actionsMenuItemElem.at(0).simulate('click');
      await nextTick();
    });

    expect(enableRule).toHaveBeenCalledTimes(1);
  });

  it('if rule is already enabled should do nothing when picking enable in the dropdown', async () => {
    const rule = mockRule({ enabled: true });
    const enableRule = jest.fn();
    const wrapper = mountWithIntl(
      <RuleStatusPanel
        {...mockAPIs}
        rule={rule}
        isEditable
        healthColor="primary"
        statusMessage="Ok"
        requestRefresh={requestRefresh}
        enableRule={enableRule}
      />
    );
    const actionsElem = wrapper
      .find('[data-test-subj="statusDropdown"] .euiBadge__childButton')
      .first();
    actionsElem.simulate('click');

    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    await act(async () => {
      const actionsMenuElem = wrapper.find('[data-test-subj="ruleStatusMenu"]');
      const actionsMenuItemElem = actionsMenuElem.first().find('.euiContextMenuItem');
      actionsMenuItemElem.at(0).simulate('click');
      await nextTick();
    });

    expect(enableRule).toHaveBeenCalledTimes(0);
  });

  it('should show the loading spinner when the rule enabled switch was clicked and the server responded with some delay', async () => {
    const rule = mockRule({
      enabled: true,
    });

    const disableRule = jest.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 6000));
    });
    const enableRule = jest.fn();
    const wrapper = mountWithIntl(
      <RuleStatusPanel
        {...mockAPIs}
        rule={rule}
        isEditable
        healthColor="primary"
        statusMessage="Ok"
        requestRefresh={requestRefresh}
        enableRule={enableRule}
        disableRule={disableRule}
      />
    );

    const actionsElem = wrapper
      .find('[data-test-subj="statusDropdown"] .euiBadge__childButton')
      .first();
    actionsElem.simulate('click');

    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    await act(async () => {
      const actionsMenuElem = wrapper.find('[data-test-subj="ruleStatusMenu"]');
      const actionsMenuItemElem = actionsMenuElem.first().find('.euiContextMenuItem');
      actionsMenuItemElem.at(1).simulate('click');
    });

    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    await act(async () => {
      expect(disableRule).toHaveBeenCalled();
      expect(
        wrapper.find('[data-test-subj="statusDropdown"] .euiBadge__childButton .euiLoadingSpinner')
          .length
      ).toBeGreaterThan(0);
    });
  });
});
