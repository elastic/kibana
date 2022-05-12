/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mountWithIntl, nextTick } from '@kbn/test-jest-helpers';
import { act } from '@testing-library/react';
import { TeamsActionConnector } from '../types';
import TeamsActionFields from './teams_connectors';
jest.mock('../../../../common/lib/kibana');

describe('TeamsActionFields renders', () => {
  test('all connector fields are rendered', async () => {
    const actionConnector = {
      secrets: {
        webhookUrl: 'https:\\test',
      },
      id: 'test',
      actionTypeId: '.teams',
      name: 'teams',
      config: {},
    } as TeamsActionConnector;
    const wrapper = mountWithIntl(
      <TeamsActionFields
        action={actionConnector}
        errors={{ index: [], webhookUrl: [] }}
        editActionConfig={() => {}}
        editActionSecrets={() => {}}
        readOnly={false}
        setCallbacks={() => {}}
        isEdit={false}
      />
    );

    await act(async () => {
      await nextTick();
      wrapper.update();
    });
    expect(wrapper.find('[data-test-subj="teamsWebhookUrlInput"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="teamsWebhookUrlInput"]').first().prop('value')).toBe(
      'https:\\test'
    );
  });

  test('should display a message on create to remember credentials', () => {
    const actionConnector = {
      actionTypeId: '.teams',
      config: {},
      secrets: {},
    } as TeamsActionConnector;
    const wrapper = mountWithIntl(
      <TeamsActionFields
        action={actionConnector}
        errors={{ index: [], webhookUrl: [] }}
        editActionConfig={() => {}}
        editActionSecrets={() => {}}
        readOnly={false}
        setCallbacks={() => {}}
        isEdit={false}
      />
    );
    expect(wrapper.find('[data-test-subj="rememberValuesMessage"]').length).toBeGreaterThan(0);
    expect(wrapper.find('[data-test-subj="reenterValuesMessage"]').length).toEqual(0);
  });

  test('should display a message on edit to re-enter credentials', () => {
    const actionConnector = {
      secrets: {
        webhookUrl: 'http:\\test',
      },
      id: 'test',
      actionTypeId: '.teams',
      name: 'teams',
      config: {},
    } as TeamsActionConnector;
    const wrapper = mountWithIntl(
      <TeamsActionFields
        action={actionConnector}
        errors={{ index: [], webhookUrl: [] }}
        editActionConfig={() => {}}
        editActionSecrets={() => {}}
        readOnly={false}
        setCallbacks={() => {}}
        isEdit={false}
      />
    );
    expect(wrapper.find('[data-test-subj="reenterValuesMessage"]').length).toBeGreaterThan(0);
    expect(wrapper.find('[data-test-subj="rememberValuesMessage"]').length).toEqual(0);
  });

  test('should display a message for missing secrets after import', () => {
    const actionConnector = {
      secrets: {
        webhookUrl: 'http:\\test',
      },
      id: 'test',
      actionTypeId: '.teams',
      isMissingSecrets: true,
      name: 'teams',
      config: {},
    } as TeamsActionConnector;
    const wrapper = mountWithIntl(
      <TeamsActionFields
        action={actionConnector}
        errors={{ index: [], webhookUrl: [] }}
        editActionConfig={() => {}}
        editActionSecrets={() => {}}
        readOnly={false}
        setCallbacks={() => {}}
        isEdit={false}
      />
    );
    expect(wrapper.find('[data-test-subj="missingSecretsMessage"]').length).toBeGreaterThan(0);
  });
});
