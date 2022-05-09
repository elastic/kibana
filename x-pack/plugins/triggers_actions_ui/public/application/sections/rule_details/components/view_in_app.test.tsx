/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';
import uuid from 'uuid';
import { mount, ReactWrapper } from 'enzyme';
import { act } from 'react-dom/test-utils';

import { Rule } from '../../../../types';
import { ViewInApp } from './view_in_app';
import { useKibana } from '../../../../common/lib/kibana';
jest.mock('../../../../common/lib/kibana');

jest.mock('../../../lib/capabilities', () => ({
  hasSaveRulesCapability: jest.fn(() => true),
}));

describe('view in app', () => {
  describe('link to the app that created the rule', () => {
    it('is disabled when there is no navigation', async () => {
      const rule = mockRule();
      const { alerting } = useKibana().services;
      let component: ReactWrapper;
      await act(async () => {
        // use mount as we need useEffect to run
        component = mount(<ViewInApp rule={rule} />);

        await waitForUseEffect();

        expect(component!.find('button').prop('disabled')).toBe(true);
        expect(component!.text()).toBe('View in app');

        expect(alerting!.getNavigation).toBeCalledWith(rule.id);
      });
    });

    it('enabled when there is navigation', async () => {
      const rule = mockRule({ id: 'rule-with-nav', consumer: 'siem' });
      const {
        application: { navigateToApp },
      } = useKibana().services;

      let component: ReactWrapper;
      act(async () => {
        // use mount as we need useEffect to run
        component = mount(<ViewInApp rule={rule} />);

        await waitForUseEffect();

        expect(component!.find('button').prop('disabled')).toBe(undefined);

        component!.find('button').prop('onClick')!({
          currentTarget: {},
        } as React.MouseEvent<{}, MouseEvent>);

        expect(navigateToApp).toBeCalledWith('siem', '/rule');
      });
    });
  });
});

function waitForUseEffect() {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
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
