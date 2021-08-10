/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test/jest';
import {
  CollapsedItemActionsWithApi as CollapsedItemActions,
  ComponentOpts,
} from './collapsed_item_actions';

describe('CollapsedItemActions', () => {
  const props: ComponentOpts = {
    deleteAlert: jest.fn(),
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
      isEditable: true,
      notifyWhen: null,
      tagsText: 'test',
      updatedAt: new Date('2020-08-20T19:23:38Z'),
    },
    enableAlert: jest.fn(),
    onAlertChanged: jest.fn(),
    muteAlert: jest.fn(),
    deleteAlerts: jest.fn(),
    disableAlert: jest.fn(),
    disableAlerts: jest.fn(),
    enableAlerts: jest.fn(),
    getHealth: jest.fn(),
    loadAlert: jest.fn(),
    loadAlertInstanceSummary: jest.fn(),
    loadAlertState: jest.fn(),
    loadAlertTypes: jest.fn(),
    muteAlertInstance: jest.fn(),
    muteAlerts: jest.fn(),
    onEditAlert: jest.fn(),
    setAlertsToDelete: jest.fn(),
    unmuteAlert: jest.fn(),
    unmuteAlertInstance: jest.fn(),
    unmuteAlerts: jest.fn(),
  };

  beforeEach(() => jest.resetAllMocks());

  test('renders panel items as disabled', () => {
    const wrapper = mountWithIntl(
      <CollapsedItemActions
        {...{
          ...props,
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
        }}
      />
    );
    expect(
      wrapper.find('[data-test-subj="collapsedActionsButton"]').first().props().disabled
    ).toBeTruthy();
  });

  test('renders panel items', () => {
    const wrapper = mountWithIntl(<CollapsedItemActions {...props} />);

    expect(
      wrapper.find('[data-test-subj="collapsedActionsButton"]').first().props().disabled
    ).toBeFalsy();
  });
});
