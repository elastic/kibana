/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { mountWithIntl, nextTick } from 'test_utils/enzyme_helpers';
import { DocLinksStart } from 'kibana/public';
import { act } from '@testing-library/react';
import { SlackActionConnector } from '../types';
import SlackActionFields from './slack_connectors';
import { coreMock } from '../../../../../../../../src/core/public/mocks';
import { TypeRegistry } from '../../../type_registry';
import { ActionsConnectorsContextProvider } from '../../../context/actions_connectors_context';

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
    const mocks = coreMock.createSetup();
    const [
      {
        application: { capabilities },
      },
    ] = await mocks.getStartServices();
    const deps = {
      toastNotifications: mocks.notifications.toasts,
      http: mocks.http,
      capabilities: {
        ...capabilities,
        actions: {
          delete: true,
          save: true,
          show: true,
        },
      },
      actionTypeRegistry: {} as TypeRegistry<any>,
      docLinks: { ELASTIC_WEBSITE_URL: '', DOC_LINK_VERSION: '' },
    };
    const wrapper = mountWithIntl(
      <ActionsConnectorsContextProvider
        value={{
          http: deps!.http,
          actionTypeRegistry: deps!.actionTypeRegistry,
          capabilities: deps!.capabilities,
          toastNotifications: deps!.toastNotifications,
          reloadConnectors: () => {
            return new Promise<void>(() => {});
          },
          docLinks: deps!.docLinks as DocLinksStart,
        }}
      >
        <SlackActionFields
          action={actionConnector}
          errors={{ index: [], webhookUrl: [] }}
          editActionConfig={() => {}}
          editActionSecrets={() => {}}
        />
      </ActionsConnectorsContextProvider>
    );

    await act(async () => {
      await nextTick();
      wrapper.update();
    });
    expect(wrapper.find('[data-test-subj="slackWebhookUrlInput"]').length > 0).toBeTruthy();
    expect(
      wrapper
        .find('[data-test-subj="slackWebhookUrlInput"]')
        .first()
        .prop('value')
    ).toBe('http:\\test');
  });
});
