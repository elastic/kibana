/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test/jest';
import { RuleEnabledSwitch, ComponentOpts } from './rule_enabled_switch';

describe('RuleEnabledSwitch', () => {
  const enableAlert = jest.fn();
  const props: ComponentOpts = {
    disableAlert: jest.fn(),
    enableAlert,
    item: {
      id: '1',
      name: 'test alert',
      tags: ['tag1'],
      enabled: true,
      alertTypeId: 'test_alert_type',
      schedule: { interval: '5d' },
      actions: [],
      params: { name: 'test alert type name' },
      createdBy: null,
      updatedBy: null,
      apiKeyOwner: null,
      throttle: '1m',
      muteAll: false,
      mutedInstanceIds: [],
      executionStatus: {
        status: 'active',
        lastExecutionDate: new Date('2020-08-20T19:23:38Z'),
      },
      consumer: 'test',
      actionsCount: 0,
      alertType: 'test_alert_type',
      createdAt: new Date('2020-08-20T19:23:38Z'),
      enabledInLicense: true,
      isEditable: false,
      notifyWhen: null,
      tagsText: 'test',
      updatedAt: new Date('2020-08-20T19:23:38Z'),
    },
    onAlertChanged: jest.fn(),
  };

  beforeEach(() => jest.resetAllMocks());

  test('renders switch control as disabled when rule is not editable', () => {
    const wrapper = mountWithIntl(<RuleEnabledSwitch {...props} />);
    expect(wrapper.find('[data-test-subj="enableSwitch"]').first().props().disabled).toBeTruthy();
  });

  test('renders switch control', () => {
    const wrapper = mountWithIntl(
      <RuleEnabledSwitch
        {...{
          ...props,
          item: {
            id: '1',
            name: 'test alert',
            tags: ['tag1'],
            enabled: false,
            alertTypeId: 'test_alert_type',
            schedule: { interval: '5d' },
            actions: [],
            params: { name: 'test alert type name' },
            createdBy: null,
            updatedBy: null,
            apiKeyOwner: null,
            throttle: '1m',
            muteAll: false,
            mutedInstanceIds: [],
            executionStatus: {
              status: 'active',
              lastExecutionDate: new Date('2020-08-20T19:23:38Z'),
            },
            consumer: 'test',
            actionsCount: 0,
            alertType: 'test_alert_type',
            createdAt: new Date('2020-08-20T19:23:38Z'),
            enabledInLicense: true,
            isEditable: true,
            notifyWhen: null,
            tagsText: 'test',
            updatedAt: new Date('2020-08-20T19:23:38Z'),
          },
        }}
      />
    );
    expect(wrapper.find('[data-test-subj="enableSwitch"]').first().props().checked).toBeFalsy();
  });
});
