/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';
import uuid from 'uuid';
import { shallow } from 'enzyme';
import { mountWithIntl, nextTick } from '@kbn/test-jest-helpers';
import { act } from 'react-dom/test-utils';
import { createMemoryHistory, createLocation } from 'history';
import { ToastsApi } from '@kbn/core/public';
import { RuleDetailsRoute, getRuleData } from './rule_details_route';
import { Rule } from '../../../../types';
import { CenterJustifiedSpinner } from '../../../components/center_justified_spinner';
import { spacesPluginMock } from '@kbn/spaces-plugin/public/mocks';
import { useKibana } from '../../../../common/lib/kibana';
jest.mock('../../../../common/lib/kibana');

jest.mock('../../../../common/lib/config_api', () => ({
  triggersActionsUiConfig: jest
    .fn()
    .mockResolvedValue({ minimumScheduleInterval: { value: '1m', enforce: false } }),
}));
describe('rule_details_route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const spacesMock = spacesPluginMock.createStartContract();
  async function setup() {
    const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useKibanaMock().services.spaces = spacesMock;
  }

  it('render a loader while fetching data', () => {
    const rule = mockRule();

    expect(
      shallow(
        <RuleDetailsRoute {...mockRouterProps(rule)} {...mockApis()} />
      ).containsMatchingElement(<CenterJustifiedSpinner />)
    ).toBeTruthy();
  });

  it('redirects to another page if fetched rule is an aliasMatch', async () => {
    await setup();
    const rule = mockRule();
    const { resolveRule } = mockApis();

    resolveRule.mockImplementationOnce(async () => ({
      ...rule,
      id: 'new_id',
      outcome: 'aliasMatch',
      alias_target_id: rule.id,
      alias_purpose: 'savedObjectConversion',
    }));
    const wrapper = mountWithIntl(
      <RuleDetailsRoute {...mockRouterProps(rule)} {...{ ...mockApis(), resolveRule }} />
    );
    await act(async () => {
      await nextTick();
      wrapper.update();
    });
    expect(resolveRule).toHaveBeenCalledWith(rule.id);
    expect((spacesMock as any).ui.redirectLegacyUrl).toHaveBeenCalledWith({
      path: 'insightsAndAlerting/triggersActions/rule/new_id',
      aliasPurpose: 'savedObjectConversion',
      objectNoun: 'rule',
    });
  });

  it('shows warning callout if fetched rule is a conflict', async () => {
    await setup();
    const rule = mockRule();
    const ruleType = {
      id: rule.ruleTypeId,
      name: 'type name',
      authorizedConsumers: ['consumer'],
    };
    const { loadRuleTypes, loadActionTypes, resolveRule } = mockApis();

    loadRuleTypes.mockImplementationOnce(async () => [ruleType]);
    loadActionTypes.mockImplementation(async () => []);
    resolveRule.mockImplementationOnce(async () => ({
      ...rule,
      id: 'new_id',
      outcome: 'conflict',
      alias_target_id: rule.id,
    }));
    const wrapper = mountWithIntl(
      <RuleDetailsRoute
        {...mockRouterProps(rule)}
        {...{ ...mockApis(), loadRuleTypes, loadActionTypes, resolveRule }}
      />
    );
    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    expect(resolveRule).toHaveBeenCalledWith(rule.id);
    expect((spacesMock as any).ui.components.getLegacyUrlConflict).toHaveBeenCalledWith({
      currentObjectId: 'new_id',
      objectNoun: 'rule',
      otherObjectId: rule.id,
      otherObjectPath: `insightsAndAlerting/triggersActions/rule/${rule.id}`,
    });
  });
});

describe('getRuleData useEffect handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches rule', async () => {
    const rule = mockRule();
    const { loadRuleTypes, loadActionTypes, resolveRule } = mockApis();
    const { setRule, setRuleType, setActionTypes } = mockStateSetter();

    resolveRule.mockImplementationOnce(async () => rule);

    const toastNotifications = {
      addDanger: jest.fn(),
    } as unknown as ToastsApi;

    await getRuleData(
      rule.id,
      loadRuleTypes,
      resolveRule,
      loadActionTypes,
      setRule,
      setRuleType,
      setActionTypes,
      toastNotifications
    );

    expect(resolveRule).toHaveBeenCalledWith(rule.id);
    expect(setRule).toHaveBeenCalledWith(rule);
  });

  it('fetches rule and connector types', async () => {
    const connectorType = {
      id: '.server-log',
      name: 'Server log',
      enabled: true,
    };
    const rule = mockRule({
      actions: [
        {
          group: '',
          id: uuid.v4(),
          actionTypeId: connectorType.id,
          params: {},
        },
      ],
    });
    const ruleType = {
      id: rule.ruleTypeId,
      name: 'type name',
    };
    const { loadRuleTypes, loadActionTypes, resolveRule } = mockApis();
    const { setRule, setRuleType, setActionTypes } = mockStateSetter();

    resolveRule.mockImplementation(async () => rule);
    loadRuleTypes.mockImplementation(async () => [ruleType]);
    loadActionTypes.mockImplementation(async () => [connectorType]);

    const toastNotifications = {
      addDanger: jest.fn(),
    } as unknown as ToastsApi;

    await getRuleData(
      rule.id,
      loadRuleTypes,
      resolveRule,
      loadActionTypes,
      setRule,
      setRuleType,
      setActionTypes,
      toastNotifications
    );

    expect(loadRuleTypes).toHaveBeenCalledTimes(1);
    expect(loadActionTypes).toHaveBeenCalledTimes(1);
    expect(resolveRule).toHaveBeenCalled();

    expect(setRule).toHaveBeenCalledWith(rule);
    expect(setRuleType).toHaveBeenCalledWith(ruleType);
    expect(setActionTypes).toHaveBeenCalledWith([connectorType]);
  });

  it('displays an error if fetching the rule results in a non-404 error', async () => {
    const connectorType = {
      id: '.server-log',
      name: 'Server log',
      enabled: true,
    };
    const rule = mockRule({
      actions: [
        {
          group: '',
          id: uuid.v4(),
          actionTypeId: connectorType.id,
          params: {},
        },
      ],
    });

    const { loadRuleTypes, loadActionTypes, resolveRule } = mockApis();
    const { setRule, setRuleType, setActionTypes } = mockStateSetter();

    resolveRule.mockImplementation(async () => {
      throw new Error('OMG');
    });

    const toastNotifications = {
      addDanger: jest.fn(),
    } as unknown as ToastsApi;
    await getRuleData(
      rule.id,
      loadRuleTypes,
      resolveRule,
      loadActionTypes,
      setRule,
      setRuleType,
      setActionTypes,
      toastNotifications
    );
    expect(toastNotifications.addDanger).toHaveBeenCalledTimes(1);
    expect(toastNotifications.addDanger).toHaveBeenCalledWith({
      title: 'Unable to load rule: OMG',
    });
  });

  it('displays an error if the rule type isnt loaded', async () => {
    const connectorType = {
      id: '.server-log',
      name: 'Server log',
      enabled: true,
    };
    const rule = mockRule({
      actions: [
        {
          group: '',
          id: uuid.v4(),
          actionTypeId: connectorType.id,
          params: {},
        },
      ],
    });

    const { loadRuleTypes, loadActionTypes, resolveRule } = mockApis();
    const { setRule, setRuleType, setActionTypes } = mockStateSetter();

    resolveRule.mockImplementation(async () => rule);

    loadRuleTypes.mockImplementation(async () => {
      throw new Error('OMG no rule type');
    });
    loadActionTypes.mockImplementation(async () => [connectorType]);

    const toastNotifications = {
      addDanger: jest.fn(),
    } as unknown as ToastsApi;
    await getRuleData(
      rule.id,
      loadRuleTypes,
      resolveRule,
      loadActionTypes,
      setRule,
      setRuleType,
      setActionTypes,
      toastNotifications
    );
    expect(toastNotifications.addDanger).toHaveBeenCalledTimes(1);
    expect(toastNotifications.addDanger).toHaveBeenCalledWith({
      title: 'Unable to load rule: OMG no rule type',
    });
  });

  it('displays an error if the connector type isnt loaded', async () => {
    const connectorType = {
      id: '.server-log',
      name: 'Server log',
      enabled: true,
    };
    const rule = mockRule({
      actions: [
        {
          group: '',
          id: uuid.v4(),
          actionTypeId: connectorType.id,
          params: {},
        },
      ],
    });
    const ruleType = {
      id: rule.ruleTypeId,
      name: 'type name',
    };

    const { loadRuleTypes, loadActionTypes, resolveRule } = mockApis();
    const { setRule, setRuleType, setActionTypes } = mockStateSetter();

    resolveRule.mockImplementation(async () => rule);

    loadRuleTypes.mockImplementation(async () => [ruleType]);
    loadActionTypes.mockImplementation(async () => {
      throw new Error('OMG no connector type');
    });

    const toastNotifications = {
      addDanger: jest.fn(),
    } as unknown as ToastsApi;
    await getRuleData(
      rule.id,
      loadRuleTypes,
      resolveRule,
      loadActionTypes,
      setRule,
      setRuleType,
      setActionTypes,
      toastNotifications
    );
    expect(toastNotifications.addDanger).toHaveBeenCalledTimes(1);
    expect(toastNotifications.addDanger).toHaveBeenCalledWith({
      title: 'Unable to load rule: OMG no connector type',
    });
  });

  it('displays an error if the rule type isnt found', async () => {
    const connectorType = {
      id: '.server-log',
      name: 'Server log',
      enabled: true,
    };
    const rule = mockRule({
      actions: [
        {
          group: '',
          id: uuid.v4(),
          actionTypeId: connectorType.id,
          params: {},
        },
      ],
    });

    const ruleType = {
      id: uuid.v4(),
      name: 'type name',
    };

    const { loadRuleTypes, loadActionTypes, resolveRule } = mockApis();
    const { setRule, setRuleType, setActionTypes } = mockStateSetter();

    resolveRule.mockImplementation(async () => rule);
    loadRuleTypes.mockImplementation(async () => [ruleType]);
    loadActionTypes.mockImplementation(async () => [connectorType]);

    const toastNotifications = {
      addDanger: jest.fn(),
    } as unknown as ToastsApi;
    await getRuleData(
      rule.id,
      loadRuleTypes,
      resolveRule,
      loadActionTypes,
      setRule,
      setRuleType,
      setActionTypes,
      toastNotifications
    );
    expect(toastNotifications.addDanger).toHaveBeenCalledTimes(1);
    expect(toastNotifications.addDanger).toHaveBeenCalledWith({
      title: `Unable to load rule: Invalid Rule Type: ${rule.ruleTypeId}`,
    });
  });

  it('displays an error if an action type isnt found', async () => {
    const availableConnectorType = {
      id: '.server-log',
      name: 'Server log',
      enabled: true,
    };
    const missingConnectorType = {
      id: '.noop',
      name: 'No Op',
      enabled: true,
    };
    const rule = mockRule({
      actions: [
        {
          group: '',
          id: uuid.v4(),
          actionTypeId: availableConnectorType.id,
          params: {},
        },
        {
          group: '',
          id: uuid.v4(),
          actionTypeId: missingConnectorType.id,
          params: {},
        },
      ],
    });

    const ruleType = {
      id: uuid.v4(),
      name: 'type name',
    };

    const { loadRuleTypes, loadActionTypes, resolveRule } = mockApis();
    const { setRule, setRuleType, setActionTypes } = mockStateSetter();

    resolveRule.mockImplementation(async () => rule);
    loadRuleTypes.mockImplementation(async () => [ruleType]);
    loadActionTypes.mockImplementation(async () => [availableConnectorType]);

    const toastNotifications = {
      addDanger: jest.fn(),
    } as unknown as ToastsApi;
    await getRuleData(
      rule.id,
      loadRuleTypes,
      resolveRule,
      loadActionTypes,
      setRule,
      setRuleType,
      setActionTypes,
      toastNotifications
    );
    expect(toastNotifications.addDanger).toHaveBeenCalledTimes(1);
    expect(toastNotifications.addDanger).toHaveBeenCalledWith({
      title: `Unable to load rule: Invalid Connector Type: ${missingConnectorType.id}`,
    });
  });
});

function mockApis() {
  return {
    loadRule: jest.fn(),
    loadRuleTypes: jest.fn(),
    loadActionTypes: jest.fn(),
    resolveRule: jest.fn(),
  };
}

function mockStateSetter() {
  return {
    setRule: jest.fn(),
    setRuleType: jest.fn(),
    setActionTypes: jest.fn(),
  };
}

function mockRouterProps(rule: Rule) {
  return {
    match: {
      isExact: false,
      path: `/rule/${rule.id}`,
      url: '',
      params: { ruleId: rule.id },
    },
    history: createMemoryHistory(),
    location: createLocation(`/rule/${rule.id}`),
  };
}
function mockRule(overloads: Partial<Rule> = {}): Rule {
  return {
    id: uuid.v4(),
    enabled: true,
    name: `rule-${uuid.v4()}`,
    tags: [],
    ruleTypeId: '.noop',
    consumer: 'consumer',
    schedule: { interval: '1m' },
    actions: [],
    params: {},
    createdBy: null,
    updatedBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    apiKeyOwner: null,
    throttle: null,
    notifyWhen: null,
    muteAll: false,
    mutedInstanceIds: [],
    executionStatus: {
      status: 'unknown',
      lastExecutionDate: new Date('2020-08-20T19:23:38Z'),
    },
    ...overloads,
  };
}
