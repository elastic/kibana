/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { mountWithIntl, nextTick } from 'test_utils/enzyme_helpers';
import { act } from 'react-dom/test-utils';
import { coreMock } from '../../../../../../../../src/core/public/mocks';
import { PagerDutyActionConnector } from '.././types';
import PagerDutyActionConnectorFields from './pagerduty_connectors';
import { ActionsConnectorsContextProvider } from '../../../context/actions_connectors_context';
import { TypeRegistry } from '../../../type_registry';
import { DocLinksStart } from 'kibana/public';

describe('PagerDutyActionConnectorFields renders', () => {
  test('all connector fields is rendered', async () => {
    const actionConnector = {
      secrets: {
        routingKey: 'test',
      },
      id: 'test',
      actionTypeId: '.pagerduty',
      name: 'pagerduty',
      config: {
        apiUrl: 'http:\\test',
      },
    } as PagerDutyActionConnector;
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
      docLinks: { ELASTIC_WEBSITE_URL: '', DOC_LINK_VERSION: '' } as DocLinksStart,
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
          docLinks: deps!.docLinks,
        }}
      >
        <PagerDutyActionConnectorFields
          action={actionConnector}
          errors={{ index: [], routingKey: [] }}
          editActionConfig={() => {}}
          editActionSecrets={() => {}}
        />
      </ActionsConnectorsContextProvider>
    );

    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    expect(wrapper.find('[data-test-subj="pagerdutyApiUrlInput"]').length > 0).toBeTruthy();
    expect(
      wrapper
        .find('[data-test-subj="pagerdutyApiUrlInput"]')
        .first()
        .prop('value')
    ).toBe('http:\\test');
    expect(wrapper.find('[data-test-subj="pagerdutyRoutingKeyInput"]').length > 0).toBeTruthy();
  });
});
