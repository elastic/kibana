/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mountWithIntl, nextTick } from '@kbn/test-jest-helpers';
import { act } from '@testing-library/react';
import { SlackActionConnector } from '../types';
import SlackActionFields from './slack_connectors';
jest.mock('../../../../common/lib/kibana');

describe('SlackActionFields renders', () => {
  test('all connector fields is rendered', async () => {
    const actionConnector = {
      secrets: {
        webhookUrl: 'http:\\test',
      },
      id: 'test',
      actionTypeId: '.email',
      name: 'email',
      config: {},
    } as SlackActionConnector;
    const wrapper = mountWithIntl(
      <SlackActionFields
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
    expect(wrapper.find('[data-test-subj="slackWebhookUrlInput"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="slackWebhookUrlInput"]').first().prop('value')).toBe(
      'http:\\test'
    );
  });

  test('should display a message on create to remember credentials', () => {
    const actionConnector = {
      actionTypeId: '.email',
      config: {},
      secrets: {},
    } as SlackActionConnector;
    const wrapper = mountWithIntl(
      <SlackActionFields
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

  test('should display a message for missing secrets after import', () => {
    const actionConnector = {
      actionTypeId: '.email',
      isMissingSecrets: true,
      config: {},
      secrets: {},
    } as SlackActionConnector;
    const wrapper = mountWithIntl(
      <SlackActionFields
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

  test('should display a message on edit to re-enter credentials', () => {
    const actionConnector = {
      secrets: {
        webhookUrl: 'http:\\test',
      },
      id: 'test',
      actionTypeId: '.email',
      name: 'email',
      config: {},
    } as SlackActionConnector;
    const wrapper = mountWithIntl(
      <SlackActionFields
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
});
