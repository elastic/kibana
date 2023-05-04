/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { mount } from 'enzyme';
import { nextTick } from '@kbn/test-jest-helpers';
import { act } from 'react-dom/test-utils';
import { RuleActions } from './rule_actions';
import { actionTypeRegistryMock } from '../../../action_type_registry.mock';
import { ActionConnector, ActionTypeModel, RuleAction } from '../../../../types';
import * as useFetchRuleActionConnectorsHook from '../../../hooks/use_fetch_rule_action_connectors';

const actionTypeRegistry = actionTypeRegistryMock.create();
const mockedUseFetchRuleActionConnectorsHook = jest.spyOn(
  useFetchRuleActionConnectorsHook,
  'useFetchRuleActionConnectors'
);
describe('Rule Actions', () => {
  async function setup() {
    const ruleActions = [
      {
        id: '1',
        group: 'metrics.inventory_threshold.fired',
        actionTypeId: '.server-log',
        params: {},
      },
      {
        id: '2',
        group: 'metrics.inventory_threshold.fired',
        actionTypeId: '.slack',
        params: {},
      },
    ] as RuleAction[];

    mockedUseFetchRuleActionConnectorsHook.mockReturnValue({
      isLoadingActionConnectors: false,
      actionConnectors: [
        {
          id: 'f57cabc0-e660-11ec-8241-7deb55b17f15',
          name: 'logs',
          config: {},
          actionTypeId: '.server-log',
        },
        {
          id: '05b7ab30-e683-11ec-843b-213c67313f8c',
          name: 'Slack',
          actionTypeId: '.slack',
        },
      ] as Array<ActionConnector<Record<string, unknown>>>,
      errorActionConnectors: undefined,
      reloadRuleActionConnectors: jest.fn(),
    });

    actionTypeRegistry.list.mockReturnValue([
      { id: '.server-log', iconClass: 'logsApp' },
      { id: '.slack', iconClass: 'logoSlack' },
      { id: '.email', iconClass: 'email' },
      { id: '.index', iconClass: 'indexOpen' },
    ] as ActionTypeModel[]);

    const wrapper = mount(
      <RuleActions ruleActions={ruleActions} actionTypeRegistry={actionTypeRegistry} />
    );
    await act(async () => {
      await nextTick();
      wrapper.update();
    });
    return wrapper;
  }

  it("renders rule action connector icons for user's selected rule actions", async () => {
    const wrapper = await setup();
    expect(mockedUseFetchRuleActionConnectorsHook).toHaveBeenCalledTimes(1);
    expect(
      wrapper.find('[data-euiicon-type]').length - wrapper.find('[data-euiicon-type="bell"]').length
    ).toBe(2);
    expect(wrapper.find('[data-euiicon-type="logsApp"]').length).toBe(1);
    expect(wrapper.find('[data-euiicon-type="logoSlack"]').length).toBe(1);
    expect(wrapper.find('[data-euiicon-type="index"]').length).toBe(0);
    expect(wrapper.find('[data-euiicon-type="email"]').length).toBe(0);
  });

  it('renders multiple rule action connectors of the same type and connector', async () => {
    const ruleActions = [
      {
        id: '1',
        group: 'metrics.inventory_threshold.fired',
        actionTypeId: '.server-log',
        params: {},
      },
      {
        id: '1',
        group: 'metrics.inventory_threshold.fired',
        actionTypeId: '.server-log',
        params: {},
      },
      {
        id: '2',
        group: 'metrics.inventory_threshold.fired',
        actionTypeId: '.server-log',
        params: {},
      },
      {
        id: '3',
        group: 'metrics.inventory_threshold.fired',
        actionTypeId: '.slack',
        params: {},
      },
      {
        id: '4',
        group: 'metrics.inventory_threshold.fired',
        actionTypeId: '.slack',
        params: {},
      },
    ];

    mockedUseFetchRuleActionConnectorsHook.mockReturnValue({
      isLoadingActionConnectors: false,
      actionConnectors: [
        {
          id: '1',
          name: 'logs1',
          config: {},
          actionTypeId: '.server-log',
        },
        {
          id: '2',
          name: 'logs2',
          config: {},
          actionTypeId: '.server-log',
        },
        {
          id: '3',
          name: 'Slack1',
          actionTypeId: '.slack',
        },
        {
          id: '4',
          name: 'Slack1',
          actionTypeId: '.slack',
        },
      ] as Array<ActionConnector<Record<string, unknown>>>,
      errorActionConnectors: undefined,
      reloadRuleActionConnectors: jest.fn(),
    });

    actionTypeRegistry.list.mockReturnValue([
      { id: '.server-log', iconClass: 'logsApp' },
      { id: '.slack', iconClass: 'logoSlack' },
      { id: '.email', iconClass: 'email' },
      { id: '.index', iconClass: 'indexOpen' },
    ] as ActionTypeModel[]);

    const wrapper = mount(
      <RuleActions ruleActions={ruleActions} actionTypeRegistry={actionTypeRegistry} />
    );

    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    expect(wrapper.find('[data-test-subj="actionConnectorName-0-logs1"]').exists).toBeTruthy();
    expect(wrapper.find('[data-test-subj="actionConnectorName-1-logs1"]').exists).toBeTruthy();
    expect(wrapper.find('[data-test-subj="actionConnectorName-2-logs2"]').exists).toBeTruthy();
    expect(wrapper.find('[data-test-subj="actionConnectorName-3-slack1"]').exists).toBeTruthy();
    expect(wrapper.find('[data-test-subj="actionConnectorName-4-slack2"]').exists).toBeTruthy();
  });
});
