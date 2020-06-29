/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { mountWithIntl, nextTick } from 'test_utils/enzyme_helpers';
import { act } from 'react-dom/test-utils';
import { PagerDutyActionConnector } from '.././types';
import PagerDutyActionConnectorFields from './pagerduty_connectors';
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
    const deps = {
      docLinks: { ELASTIC_WEBSITE_URL: '', DOC_LINK_VERSION: '' } as DocLinksStart,
    };

    const wrapper = mountWithIntl(
      <PagerDutyActionConnectorFields
        action={actionConnector}
        errors={{ index: [], routingKey: [] }}
        editActionConfig={() => {}}
        editActionSecrets={() => {}}
        docLinks={deps!.docLinks}
      />
    );

    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    expect(wrapper.find('[data-test-subj="pagerdutyApiUrlInput"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="pagerdutyApiUrlInput"]').first().prop('value')).toBe(
      'http:\\test'
    );
    expect(wrapper.find('[data-test-subj="pagerdutyRoutingKeyInput"]').length > 0).toBeTruthy();
  });
});
