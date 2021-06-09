/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mountWithIntl, nextTick } from '@kbn/test/jest';
import { act } from 'react-dom/test-utils';
import { SwimlaneActionConnector } from './types';
import SwimlaneActionConnectorFields from './swimlane_connectors';
jest.mock('../../../../common/lib/kibana');

describe('SwimlaneActionConnectorFields renders', () => {
  test('all connector fields is rendered', async () => {
    const actionConnector = {
      secrets: {
        apiToken: 'test',
      },
      id: 'test',
      actionTypeId: '.swimlane',
      name: 'swimlane',
      config: {
        apiUrl: 'http:\\test',
        appId: '1234567asbd32',
        mappings: {
          alertSourceConfig: { id: '123', key: 'product-source' },
          severityConfig: { id: '123', key: 'severity' },
          caseNameConfig: { id: '123', key: 'case-name' },
          caseIdConfig: { id: '123', key: 'case-id' },
        },
      },
    } as SwimlaneActionConnector;

    const wrapper = mountWithIntl(
      <SwimlaneActionConnectorFields
        action={actionConnector}
        errors={{ connectorType: [], appId: [], apiUrl: [], mappings: [], apiToken: [] }}
        editActionConfig={() => {}}
        editActionSecrets={() => {}}
        readOnly={false}
      />
    );

    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    expect(wrapper.find('[data-test-subj="swimlaneApiUrlInput"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="swimlaneApiUrlInput"]').first().prop('value')).toBe(
      'http:\\test'
    );
    expect(wrapper.find('[data-test-subj="swimlaneAppIdInput"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="swimlaneApiTokenInput"]').length > 0).toBeTruthy();
  });

  test('should display a message on create to remember credentials', () => {
    const actionConnector = {
      actionTypeId: '.swimlane',
      secrets: {},
      config: {},
    } as SwimlaneActionConnector;

    const wrapper = mountWithIntl(
      <SwimlaneActionConnectorFields
        action={actionConnector}
        errors={{ connectorType: [], appId: [], apiUrl: [], mappings: [], apiToken: [] }}
        editActionConfig={() => {}}
        editActionSecrets={() => {}}
        readOnly={false}
      />
    );
    expect(wrapper.find('[data-test-subj="rememberValuesMessage"]').length).toBeGreaterThan(0);
    expect(wrapper.find('[data-test-subj="reenterValuesMessage"]').length).toEqual(0);
  });

  test('should display a message on edit to re-enter credentials', () => {
    const actionConnector = {
      secrets: {
        apiToken: 'test',
      },
      id: 'test',
      actionTypeId: '.swimlane',
      name: 'swimlane',
      config: {
        apiUrl: 'http:\\test',
        appId: '1234567asbd32',
        mappings: {
          alertSourceConfig: { id: '123', key: 'product-source' },
          severityConfig: { id: '123', key: 'severity' },
          caseNameConfig: { id: '123', key: 'case-name' },
          caseIdConfig: { id: '123', key: 'case-id' },
        },
      },
    } as SwimlaneActionConnector;

    const wrapper = mountWithIntl(
      <SwimlaneActionConnectorFields
        action={actionConnector}
        errors={{ connectorType: [], appId: [], apiUrl: [], mappings: [], apiToken: [] }}
        editActionConfig={() => {}}
        editActionSecrets={() => {}}
        readOnly={false}
      />
    );
    expect(wrapper.find('[data-test-subj="reenterValuesMessage"]').length).toBeGreaterThan(0);
    expect(wrapper.find('[data-test-subj="rememberValuesMessage"]').length).toEqual(0);
  });
});
