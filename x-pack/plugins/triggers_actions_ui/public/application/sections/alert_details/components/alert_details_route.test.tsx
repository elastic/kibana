/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';
import uuid from 'uuid';
import { shallow } from 'enzyme';
import { mountWithIntl, nextTick } from '@kbn/test/jest';
import { act } from 'react-dom/test-utils';
import { createMemoryHistory, createLocation } from 'history';
import { ToastsApi } from 'kibana/public';
import { AlertDetailsRoute, getRuleData } from './alert_details_route';
import { Alert } from '../../../../types';
import { CenterJustifiedSpinner } from '../../../components/center_justified_spinner';
import { spacesPluginMock } from '../../../../../../spaces/public/mocks';
import { useKibana } from '../../../../common/lib/kibana';
jest.mock('../../../../common/lib/kibana');

class NotFoundError extends Error {
  public readonly body: {
    statusCode: number;
    name: string;
  } = {
    statusCode: 404,
    name: 'Not found',
  };

  constructor(message: string | undefined) {
    super(message);
  }
}

describe('alert_details_route', () => {
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
        <AlertDetailsRoute {...mockRouterProps(rule)} {...mockApis()} />
      ).containsMatchingElement(<CenterJustifiedSpinner />)
    ).toBeTruthy();
  });

  it('redirects to another page if fetched rule is an aliasMatch', async () => {
    await setup();
    const rule = mockRule();
    const { loadAlert, resolveRule } = mockApis();

    loadAlert.mockImplementationOnce(async () => {
      throw new NotFoundError('OMG');
    });
    resolveRule.mockImplementationOnce(async () => ({
      ...rule,
      id: 'new_id',
      outcome: 'aliasMatch',
      alias_target_id: rule.id,
    }));
    const wrapper = mountWithIntl(
      <AlertDetailsRoute
        {...mockRouterProps(rule)}
        {...{ ...mockApis(), loadAlert, resolveRule }}
      />
    );
    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    expect(loadAlert).toHaveBeenCalledWith(rule.id);
    expect(resolveRule).toHaveBeenCalledWith(rule.id);
    expect((spacesMock as any).ui.redirectLegacyUrl).toHaveBeenCalledWith(
      `insightsAndAlerting/triggersActions/rule/new_id`,
      `rule`
    );
  });

  it('shows warning callout if fetched rule is a conflict', async () => {
    await setup();
    const rule = mockRule();
    const ruleType = {
      id: rule.alertTypeId,
      name: 'type name',
      authorizedConsumers: ['consumer'],
    };
    const { loadAlert, loadAlertTypes, loadActionTypes, resolveRule } = mockApis();

    loadAlert.mockImplementationOnce(async () => {
      throw new NotFoundError('OMG');
    });
    loadAlertTypes.mockImplementationOnce(async () => [ruleType]);
    loadActionTypes.mockImplementation(async () => []);
    resolveRule.mockImplementationOnce(async () => ({
      ...rule,
      id: 'new_id',
      outcome: 'conflict',
      alias_target_id: rule.id,
    }));
    const wrapper = mountWithIntl(
      <AlertDetailsRoute
        {...mockRouterProps(rule)}
        {...{ ...mockApis(), loadAlert, loadAlertTypes, loadActionTypes, resolveRule }}
      />
    );
    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    expect(loadAlert).toHaveBeenCalledWith(rule.id);
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
    const { loadAlert, loadAlertTypes, loadActionTypes, resolveRule } = mockApis();
    const { setAlert, setAlertType, setActionTypes } = mockStateSetter();

    loadAlert.mockImplementationOnce(async () => rule);

    const toastNotifications = {
      addDanger: jest.fn(),
    } as unknown as ToastsApi;

    await getRuleData(
      rule.id,
      loadAlert,
      loadAlertTypes,
      resolveRule,
      loadActionTypes,
      setAlert,
      setAlertType,
      setActionTypes,
      toastNotifications
    );

    expect(loadAlert).toHaveBeenCalledWith(rule.id);
    expect(resolveRule).not.toHaveBeenCalled();
    expect(setAlert).toHaveBeenCalledWith(rule);
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
      id: rule.alertTypeId,
      name: 'type name',
    };
    const { loadAlert, loadAlertTypes, loadActionTypes, resolveRule } = mockApis();
    const { setAlert, setAlertType, setActionTypes } = mockStateSetter();

    loadAlert.mockImplementation(async () => rule);
    loadAlertTypes.mockImplementation(async () => [ruleType]);
    loadActionTypes.mockImplementation(async () => [connectorType]);

    const toastNotifications = {
      addDanger: jest.fn(),
    } as unknown as ToastsApi;

    await getRuleData(
      rule.id,
      loadAlert,
      loadAlertTypes,
      resolveRule,
      loadActionTypes,
      setAlert,
      setAlertType,
      setActionTypes,
      toastNotifications
    );

    expect(loadAlertTypes).toHaveBeenCalledTimes(1);
    expect(loadActionTypes).toHaveBeenCalledTimes(1);
    expect(resolveRule).not.toHaveBeenCalled();

    expect(setAlert).toHaveBeenCalledWith(rule);
    expect(setAlertType).toHaveBeenCalledWith(ruleType);
    expect(setActionTypes).toHaveBeenCalledWith([connectorType]);
  });

  it('fetches rule using resolve if initial GET results in a 404 error', async () => {
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

    const { loadAlert, loadAlertTypes, loadActionTypes, resolveRule } = mockApis();
    const { setAlert, setAlertType, setActionTypes } = mockStateSetter();

    loadAlert.mockImplementationOnce(async () => {
      throw new NotFoundError('OMG');
    });
    resolveRule.mockImplementationOnce(async () => rule);

    const toastNotifications = {
      addDanger: jest.fn(),
    } as unknown as ToastsApi;
    await getRuleData(
      rule.id,
      loadAlert,
      loadAlertTypes,
      resolveRule,
      loadActionTypes,
      setAlert,
      setAlertType,
      setActionTypes,
      toastNotifications
    );

    expect(loadAlert).toHaveBeenCalledWith(rule.id);
    expect(resolveRule).toHaveBeenCalledWith(rule.id);
    expect(setAlert).toHaveBeenCalledWith(rule);
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

    const { loadAlert, loadAlertTypes, loadActionTypes, resolveRule } = mockApis();
    const { setAlert, setAlertType, setActionTypes } = mockStateSetter();

    loadAlert.mockImplementation(async () => {
      throw new Error('OMG');
    });

    const toastNotifications = {
      addDanger: jest.fn(),
    } as unknown as ToastsApi;
    await getRuleData(
      rule.id,
      loadAlert,
      loadAlertTypes,
      resolveRule,
      loadActionTypes,
      setAlert,
      setAlertType,
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

    const { loadAlert, loadAlertTypes, loadActionTypes, resolveRule } = mockApis();
    const { setAlert, setAlertType, setActionTypes } = mockStateSetter();

    loadAlert.mockImplementation(async () => rule);

    loadAlertTypes.mockImplementation(async () => {
      throw new Error('OMG no rule type');
    });
    loadActionTypes.mockImplementation(async () => [connectorType]);

    const toastNotifications = {
      addDanger: jest.fn(),
    } as unknown as ToastsApi;
    await getRuleData(
      rule.id,
      loadAlert,
      loadAlertTypes,
      resolveRule,
      loadActionTypes,
      setAlert,
      setAlertType,
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
      id: rule.alertTypeId,
      name: 'type name',
    };

    const { loadAlert, loadAlertTypes, loadActionTypes, resolveRule } = mockApis();
    const { setAlert, setAlertType, setActionTypes } = mockStateSetter();

    loadAlert.mockImplementation(async () => rule);

    loadAlertTypes.mockImplementation(async () => [ruleType]);
    loadActionTypes.mockImplementation(async () => {
      throw new Error('OMG no connector type');
    });

    const toastNotifications = {
      addDanger: jest.fn(),
    } as unknown as ToastsApi;
    await getRuleData(
      rule.id,
      loadAlert,
      loadAlertTypes,
      resolveRule,
      loadActionTypes,
      setAlert,
      setAlertType,
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

    const { loadAlert, loadAlertTypes, loadActionTypes, resolveRule } = mockApis();
    const { setAlert, setAlertType, setActionTypes } = mockStateSetter();

    loadAlert.mockImplementation(async () => rule);
    loadAlertTypes.mockImplementation(async () => [ruleType]);
    loadActionTypes.mockImplementation(async () => [connectorType]);

    const toastNotifications = {
      addDanger: jest.fn(),
    } as unknown as ToastsApi;
    await getRuleData(
      rule.id,
      loadAlert,
      loadAlertTypes,
      resolveRule,
      loadActionTypes,
      setAlert,
      setAlertType,
      setActionTypes,
      toastNotifications
    );
    expect(toastNotifications.addDanger).toHaveBeenCalledTimes(1);
    expect(toastNotifications.addDanger).toHaveBeenCalledWith({
      title: `Unable to load rule: Invalid Rule Type: ${rule.alertTypeId}`,
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

    const { loadAlert, loadAlertTypes, loadActionTypes, resolveRule } = mockApis();
    const { setAlert, setAlertType, setActionTypes } = mockStateSetter();

    loadAlert.mockImplementation(async () => rule);
    loadAlertTypes.mockImplementation(async () => [ruleType]);
    loadActionTypes.mockImplementation(async () => [availableConnectorType]);

    const toastNotifications = {
      addDanger: jest.fn(),
    } as unknown as ToastsApi;
    await getRuleData(
      rule.id,
      loadAlert,
      loadAlertTypes,
      resolveRule,
      loadActionTypes,
      setAlert,
      setAlertType,
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
    loadAlert: jest.fn(),
    loadAlertTypes: jest.fn(),
    loadActionTypes: jest.fn(),
    resolveRule: jest.fn(),
  };
}

function mockStateSetter() {
  return {
    setAlert: jest.fn(),
    setAlertType: jest.fn(),
    setActionTypes: jest.fn(),
  };
}

function mockRouterProps(rule: Alert) {
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
function mockRule(overloads: Partial<Alert> = {}): Alert {
  return {
    id: uuid.v4(),
    enabled: true,
    name: `rule-${uuid.v4()}`,
    tags: [],
    alertTypeId: '.noop',
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
