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
import { Actions } from './actions';
import { observabilityPublicPluginsStartMock } from '../../../observability_public_plugins_start.mock';
import { kibanaStartMock } from '../../../utils/kibana_react.mock';

const mockUseKibanaReturnValue = kibanaStartMock.startContract();

jest.mock('../../../utils/kibana_react', () => ({
  __esModule: true,
  useKibana: jest.fn(() => mockUseKibanaReturnValue),
}));

jest.mock('@kbn/triggers-actions-ui-plugin/public/application/lib/action_connector_api', () => ({
  loadAllActions: jest.fn(),
}));

describe('Actions', () => {
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
    const { loadAllActions } = jest.requireMock(
      '@kbn/triggers-actions-ui-plugin/public/application/lib/action_connector_api'
    );
    loadAllActions.mockResolvedValueOnce([
      {
        id: 'a0d2f6c0-e682-11ec-843b-213c67313f8c',
        name: 'Email',
        config: {},
        actionTypeId: '.email',
      },
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
    ]);

    const actionTypeRegistryMock =
      observabilityPublicPluginsStartMock.createStart().triggersActionsUi.actionTypeRegistry;
    actionTypeRegistryMock.list.mockReturnValue([
      { id: '.server-log', iconClass: 'logsApp' },
      { id: '.slack', iconClass: 'logoSlack' },
      { id: '.email', iconClass: 'email' },
      { id: '.index', iconClass: 'indexOpen' },
    ]);
    const wrapper = mount(
      <Actions ruleActions={ruleActions} actionTypeRegistry={actionTypeRegistryMock} />
    );
    await act(async () => {
      await nextTick();
      wrapper.update();
    });
    return wrapper;
  }

  it("renders action connector icons for user's selected rule actions", async () => {
    const wrapper = await setup();
    wrapper.debug();
    expect(wrapper.find('[data-euiicon-type]').length).toBe(2);
    expect(wrapper.find('[data-euiicon-type="logsApp"]').length).toBe(1);
    expect(wrapper.find('[data-euiicon-type="logoSlack"]').length).toBe(1);
    expect(wrapper.find('[data-euiicon-type="index"]').length).toBe(0);
    expect(wrapper.find('[data-euiicon-type="email"]').length).toBe(0);
  });
});
