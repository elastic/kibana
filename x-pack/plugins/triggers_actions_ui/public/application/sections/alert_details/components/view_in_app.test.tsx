/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as React from 'react';
import uuid from 'uuid';
import { mount, ReactWrapper } from 'enzyme';
import { act } from 'react-dom/test-utils';

import { Alert } from '../../../../types';
import { ViewInApp } from './view_in_app';
import { useAppDependencies } from '../../../app_context';

jest.mock('../../../app_context', () => {
  const alerts = {
    getNavigation: jest.fn(async (id) =>
      id === 'alert-with-nav' ? { path: '/alert' } : undefined
    ),
  };
  const navigateToApp = jest.fn();
  return {
    useAppDependencies: jest.fn(() => ({
      http: jest.fn(),
      navigateToApp,
      alerts,
      legacy: {
        capabilities: {
          get: jest.fn(() => ({})),
        },
      },
    })),
  };
});

jest.mock('../../../lib/capabilities', () => ({
  hasSaveAlertsCapability: jest.fn(() => true),
}));

describe('view in app', () => {
  describe('link to the app that created the alert', () => {
    it('is disabled when there is no navigation', async () => {
      const alert = mockAlert();
      const { alerts } = useAppDependencies();

      let component: ReactWrapper;
      await act(async () => {
        // use mount as we need useEffect to run
        component = mount(<ViewInApp alert={alert} />);

        await waitForUseEffect();

        expect(component!.find('button').prop('disabled')).toBe(true);
        expect(component!.text()).toBe('View in app');

        expect(alerts!.getNavigation).toBeCalledWith(alert.id);
      });
    });

    it('enabled when there is navigation', async () => {
      const alert = mockAlert({ id: 'alert-with-nav', consumer: 'siem' });
      const { navigateToApp } = useAppDependencies();

      let component: ReactWrapper;
      act(async () => {
        // use mount as we need useEffect to run
        component = mount(<ViewInApp alert={alert} />);

        await waitForUseEffect();

        expect(component!.find('button').prop('disabled')).toBe(undefined);

        component!.find('button').prop('onClick')!({
          currentTarget: {},
        } as React.MouseEvent<{}, MouseEvent>);

        expect(navigateToApp).toBeCalledWith('siem', '/alert');
      });
    });
  });
});

function waitForUseEffect() {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

function mockAlert(overloads: Partial<Alert> = {}): Alert {
  return {
    id: uuid.v4(),
    enabled: true,
    name: `alert-${uuid.v4()}`,
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
    muteAll: false,
    mutedInstanceIds: [],
    ...overloads,
  };
}
