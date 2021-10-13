/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as React from 'react';

import { mountWithIntl, nextTick } from '@kbn/test/jest';
import { CollapsedItemActions } from './collapsed_item_actions';
import { act } from 'react-dom/test-utils';
import { ruleTypeRegistryMock } from '../../../rule_type_registry.mock';
import { AlertTableItem, AlertTypeModel } from '../../../../types';
import { useKibana } from '../../../../common/lib/kibana';
jest.mock('../../../../common/lib/kibana');

const onAlertChanged = jest.fn();
const onEditAlert = jest.fn();
const setAlertsToDelete = jest.fn();
const disableAlert = jest.fn();
const enableAlert = jest.fn();
const unmuteAlert = jest.fn();
const muteAlert = jest.fn();

export const tick = (ms = 0) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

describe('CollapsedItemActions', () => {
  async function setup(editable: boolean = true) {
    const ruleTypeRegistry = ruleTypeRegistryMock.create();
    ruleTypeRegistry.has.mockReturnValue(true);
    const alertTypeR: AlertTypeModel = {
      id: 'my-alert-type',
      iconClass: 'test',
      description: 'Alert when testing',
      documentationUrl: 'https://localhost.local/docs',
      validate: () => {
        return { errors: {} };
      },
      alertParamsExpression: jest.fn(),
      requiresAppContext: !editable,
    };
    ruleTypeRegistry.get.mockReturnValue(alertTypeR);
    const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useKibanaMock().services.ruleTypeRegistry = ruleTypeRegistry;
  }

  const getPropsWithRule = (overrides = {}, editable = false) => {
    const rule: AlertTableItem = {
      id: '1',
      enabled: true,
      name: 'test rule',
      tags: ['tag1'],
      alertTypeId: 'test_rule_type',
      consumer: 'alerts',
      schedule: { interval: '5d' },
      actions: [
        { id: 'test', actionTypeId: 'the_connector', group: 'rule', params: { message: 'test' } },
      ],
      params: { name: 'test rule type name' },
      createdBy: null,
      updatedBy: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      apiKeyOwner: null,
      throttle: '1m',
      notifyWhen: 'onActiveAlert',
      muteAll: false,
      mutedInstanceIds: [],
      executionStatus: {
        status: 'active',
        lastExecutionDate: new Date('2020-08-20T19:23:38Z'),
      },
      actionsCount: 1,
      index: 0,
      alertType: 'Test Alert Type',
      isEditable: true,
      enabledInLicense: true,
      ...overrides,
    };

    return {
      item: rule,
      onAlertChanged,
      onEditAlert,
      setAlertsToDelete,
      disableAlert,
      enableAlert,
      unmuteAlert,
      muteAlert,
    };
  };

  test('renders panel items as disabled', async () => {
    await setup();
    const wrapper = mountWithIntl(
      <CollapsedItemActions {...getPropsWithRule({ isEditable: false })} />
    );
    await act(async () => {
      await nextTick();
      wrapper.update();
    });
    expect(
      wrapper.find('[data-test-subj="selectActionButton"]').first().props().disabled
    ).toBeTruthy();
  });

  test('renders closed popover initially and opens on click with all actions enabled', async () => {
    await setup();
    const wrapper = mountWithIntl(<CollapsedItemActions {...getPropsWithRule()} />);

    expect(wrapper.find('[data-test-subj="selectActionButton"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="collapsedActionPanel"]').exists()).toBeFalsy();
    expect(wrapper.find('[data-test-subj="muteButton"]').exists()).toBeFalsy();
    expect(wrapper.find('[data-test-subj="disableButton"]').exists()).toBeFalsy();
    expect(wrapper.find('[data-test-subj="editAlert"]').exists()).toBeFalsy();
    expect(wrapper.find('[data-test-subj="deleteAlert"]').exists()).toBeFalsy();

    wrapper.find('[data-test-subj="selectActionButton"]').first().simulate('click');
    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    expect(wrapper.find('[data-test-subj="collapsedActionPanel"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="muteButton"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="disableButton"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="editAlert"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="deleteAlert"]').exists()).toBeTruthy();

    expect(
      wrapper.find('[data-test-subj="selectActionButton"]').first().props().disabled
    ).toBeFalsy();

    expect(wrapper.find(`[data-test-subj="muteButton"] button`).prop('disabled')).toBeFalsy();
    expect(wrapper.find(`[data-test-subj="muteButton"] button`).text()).toEqual('Mute');
    expect(wrapper.find(`[data-test-subj="disableButton"] button`).prop('disabled')).toBeFalsy();
    expect(wrapper.find(`[data-test-subj="disableButton"] button`).text()).toEqual('Disable');
    expect(wrapper.find(`[data-test-subj="editAlert"] button`).prop('disabled')).toBeFalsy();
    expect(wrapper.find(`[data-test-subj="editAlert"] button`).text()).toEqual('Edit rule');
    expect(wrapper.find(`[data-test-subj="deleteAlert"] button`).prop('disabled')).toBeFalsy();
    expect(wrapper.find(`[data-test-subj="deleteAlert"] button`).text()).toEqual('Delete rule');
  });

  test('handles case when rule is unmuted and enabled and mute is clicked', async () => {
    await setup();
    const wrapper = mountWithIntl(<CollapsedItemActions {...getPropsWithRule()} />);
    wrapper.find('[data-test-subj="selectActionButton"]').first().simulate('click');
    await act(async () => {
      await nextTick();
      wrapper.update();
    });
    wrapper.find('button[data-test-subj="muteButton"]').simulate('click');
    await act(async () => {
      await tick(10);
      wrapper.update();
    });
    expect(muteAlert).toHaveBeenCalled();
  });

  test('handles case when rule is unmuted and enabled and disable is clicked', async () => {
    await setup();
    const wrapper = mountWithIntl(<CollapsedItemActions {...getPropsWithRule()} />);
    wrapper.find('[data-test-subj="selectActionButton"]').first().simulate('click');
    await act(async () => {
      await nextTick();
      wrapper.update();
    });
    wrapper.find('button[data-test-subj="disableButton"]').simulate('click');
    await act(async () => {
      await tick(10);
      wrapper.update();
    });
    expect(disableAlert).toHaveBeenCalled();
  });

  test('handles case when rule is muted and enabled and unmute is clicked', async () => {
    await setup();
    const wrapper = mountWithIntl(
      <CollapsedItemActions {...getPropsWithRule({ muteAll: true })} />
    );
    wrapper.find('[data-test-subj="selectActionButton"]').first().simulate('click');
    await act(async () => {
      await nextTick();
      wrapper.update();
    });
    wrapper.find('button[data-test-subj="muteButton"]').simulate('click');
    await act(async () => {
      await tick(10);
      wrapper.update();
    });
    expect(unmuteAlert).toHaveBeenCalled();
  });

  test('handles case when rule is unmuted and disabled and enable is clicked', async () => {
    await setup();
    const wrapper = mountWithIntl(
      <CollapsedItemActions {...getPropsWithRule({ enabled: false })} />
    );
    wrapper.find('[data-test-subj="selectActionButton"]').first().simulate('click');
    await act(async () => {
      await nextTick();
      wrapper.update();
    });
    wrapper.find('button[data-test-subj="disableButton"]').simulate('click');
    await act(async () => {
      await tick(10);
      wrapper.update();
    });
    expect(enableAlert).toHaveBeenCalled();
  });

  test('handles case when edit rule is clicked', async () => {
    await setup();
    const wrapper = mountWithIntl(<CollapsedItemActions {...getPropsWithRule()} />);
    wrapper.find('[data-test-subj="selectActionButton"]').first().simulate('click');
    await act(async () => {
      await nextTick();
      wrapper.update();
    });
    wrapper.find('button[data-test-subj="editAlert"]').simulate('click');
    await act(async () => {
      await nextTick();
      wrapper.update();
    });
    expect(onEditAlert).toHaveBeenCalled();
  });

  test('handles case when delete rule is clicked', async () => {
    await setup();
    const wrapper = mountWithIntl(<CollapsedItemActions {...getPropsWithRule()} />);
    wrapper.find('[data-test-subj="selectActionButton"]').first().simulate('click');
    await act(async () => {
      await nextTick();
      wrapper.update();
    });
    wrapper.find('button[data-test-subj="deleteAlert"]').simulate('click');
    await act(async () => {
      await nextTick();
      wrapper.update();
    });
    expect(setAlertsToDelete).toHaveBeenCalled();
  });

  test('renders actions correctly when rule is disabled', async () => {
    await setup();
    const wrapper = mountWithIntl(
      <CollapsedItemActions {...getPropsWithRule({ enabled: false })} />
    );
    wrapper.find('[data-test-subj="selectActionButton"]').first().simulate('click');
    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    expect(wrapper.find(`[data-test-subj="muteButton"] button`).prop('disabled')).toBeTruthy();
    expect(wrapper.find(`[data-test-subj="muteButton"] button`).text()).toEqual('Mute');
    expect(wrapper.find(`[data-test-subj="disableButton"] button`).prop('disabled')).toBeFalsy();
    expect(wrapper.find(`[data-test-subj="disableButton"] button`).text()).toEqual('Enable');
    expect(wrapper.find(`[data-test-subj="editAlert"] button`).prop('disabled')).toBeFalsy();
    expect(wrapper.find(`[data-test-subj="editAlert"] button`).text()).toEqual('Edit rule');
    expect(wrapper.find(`[data-test-subj="deleteAlert"] button`).prop('disabled')).toBeFalsy();
    expect(wrapper.find(`[data-test-subj="deleteAlert"] button`).text()).toEqual('Delete rule');
  });

  test('renders actions correctly when rule is not editable', async () => {
    await setup();
    const wrapper = mountWithIntl(
      <CollapsedItemActions {...getPropsWithRule({ isEditable: false })} />
    );
    wrapper.find('[data-test-subj="selectActionButton"]').first().simulate('click');
    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    expect(
      wrapper.find(`[data-test-subj="selectActionButton"] button`).prop('disabled')
    ).toBeTruthy();
  });

  test('renders actions correctly when rule is not enabled due to license', async () => {
    await setup();
    const wrapper = mountWithIntl(
      <CollapsedItemActions {...getPropsWithRule({ enabledInLicense: false })} />
    );
    wrapper.find('[data-test-subj="selectActionButton"]').first().simulate('click');
    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    expect(wrapper.find(`[data-test-subj="muteButton"] button`).prop('disabled')).toBeTruthy();
    expect(wrapper.find(`[data-test-subj="muteButton"] button`).text()).toEqual('Mute');
    expect(wrapper.find(`[data-test-subj="disableButton"] button`).prop('disabled')).toBeTruthy();
    expect(wrapper.find(`[data-test-subj="disableButton"] button`).text()).toEqual('Disable');
    expect(wrapper.find(`[data-test-subj="editAlert"] button`).prop('disabled')).toBeFalsy();
    expect(wrapper.find(`[data-test-subj="editAlert"] button`).text()).toEqual('Edit rule');
    expect(wrapper.find(`[data-test-subj="deleteAlert"] button`).prop('disabled')).toBeFalsy();
    expect(wrapper.find(`[data-test-subj="deleteAlert"] button`).text()).toEqual('Delete rule');
  });

  test('renders actions correctly when rule is muted', async () => {
    await setup();
    const wrapper = mountWithIntl(
      <CollapsedItemActions {...getPropsWithRule({ muteAll: true })} />
    );
    wrapper.find('[data-test-subj="selectActionButton"]').first().simulate('click');
    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    expect(wrapper.find(`[data-test-subj="muteButton"] button`).prop('disabled')).toBeFalsy();
    expect(wrapper.find(`[data-test-subj="muteButton"] button`).text()).toEqual('Unmute');
    expect(wrapper.find(`[data-test-subj="disableButton"] button`).prop('disabled')).toBeFalsy();
    expect(wrapper.find(`[data-test-subj="disableButton"] button`).text()).toEqual('Disable');
    expect(wrapper.find(`[data-test-subj="editAlert"] button`).prop('disabled')).toBeFalsy();
    expect(wrapper.find(`[data-test-subj="editAlert"] button`).text()).toEqual('Edit rule');
    expect(wrapper.find(`[data-test-subj="deleteAlert"] button`).prop('disabled')).toBeFalsy();
    expect(wrapper.find(`[data-test-subj="deleteAlert"] button`).text()).toEqual('Delete rule');
  });

  test('renders actions correctly when rule type is not editable in this context', async () => {
    await setup(false);
    const wrapper = mountWithIntl(<CollapsedItemActions {...getPropsWithRule()} />);
    wrapper.find('[data-test-subj="selectActionButton"]').first().simulate('click');
    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    expect(wrapper.find(`[data-test-subj="muteButton"] button`).prop('disabled')).toBeFalsy();
    expect(wrapper.find(`[data-test-subj="muteButton"] button`).text()).toEqual('Mute');
    expect(wrapper.find(`[data-test-subj="disableButton"] button`).prop('disabled')).toBeFalsy();
    expect(wrapper.find(`[data-test-subj="disableButton"] button`).text()).toEqual('Disable');
    expect(wrapper.find(`[data-test-subj="editAlert"] button`).prop('disabled')).toBeTruthy();
    expect(wrapper.find(`[data-test-subj="editAlert"] button`).text()).toEqual('Edit rule');
    expect(wrapper.find(`[data-test-subj="deleteAlert"] button`).prop('disabled')).toBeFalsy();
    expect(wrapper.find(`[data-test-subj="deleteAlert"] button`).text()).toEqual('Delete rule');
  });
});
