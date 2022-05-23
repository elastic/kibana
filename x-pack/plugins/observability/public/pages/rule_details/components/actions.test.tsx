/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { ReactWrapper, mount } from 'enzyme';
import { Actions } from './actions';
import { observabilityPublicPluginsStartMock } from '../../../observability_public_plugins_start.mock';
import { kibanaStartMock } from '../../../utils/kibana_react.mock';

const mockUseKibanaReturnValue = kibanaStartMock.startContract();

jest.mock('../../../utils/kibana_react', () => ({
  __esModule: true,
  useKibana: jest.fn(() => mockUseKibanaReturnValue),
}));

jest.mock('../../../hooks/use_fetch_rule_actions', () => ({
  useFetchRuleActions: jest.fn(),
}));

const { useFetchRuleActions } = jest.requireMock('../../../hooks/use_fetch_rule_actions');

describe('Actions', () => {
  let wrapper: ReactWrapper<any>;
  async function setup() {
    const ruleActions = [
      {
        id: 1,
        group: 'metrics.inventory_threshold.fired',
        actionTypeId: '.server-log',
      },
      {
        id: 2,
        group: 'metrics.inventory_threshold.fired',
        actionTypeId: '.slack',
      },
    ];
    const allActions = [
      {
        id: 1,
        name: 'Server log',
        actionTypeId: '.server-log',
      },
      {
        id: 2,
        name: 'Slack',
        actionTypeId: '.slack',
      },
      {
        id: 3,
        name: 'Email',
        actionTypeId: '.email',
      },
    ];
    useFetchRuleActions.mockReturnValue({
      allActions,
    });

    const actionTypeRegistryMock =
      observabilityPublicPluginsStartMock.createStart().triggersActionsUi.actionTypeRegistry;
    actionTypeRegistryMock.list.mockReturnValue([
      { id: '.server-log', iconClass: 'logsApp' },
      { id: '.slack', iconClass: 'logoSlack' },
      { id: '.email', iconClass: 'email' },
      { id: '.index', iconClass: 'indexOpen' },
    ]);
    wrapper = mount(
      <Actions ruleActions={ruleActions} actionTypeRegistry={actionTypeRegistryMock} />
    );
  }

  it("renders action connector icons for user's selected rule actions", async () => {
    await setup();
    wrapper.debug();
    expect(wrapper.find('[data-euiicon-type]').length).toBe(2);
    expect(wrapper.find('[data-euiicon-type="logsApp"]').length).toBe(1);
    expect(wrapper.find('[data-euiicon-type="logoSlack"]').length).toBe(1);
    expect(wrapper.find('[data-euiicon-type="index"]').length).toBe(0);
    expect(wrapper.find('[data-euiicon-type="email"]').length).toBe(0);
  });
});
