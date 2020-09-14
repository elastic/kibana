/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { mountWithIntl } from 'test_utils/enzyme_helpers';
import { DocLinksStart } from 'kibana/public';
import ResilientConnectorFields from './resilient_connectors';
import { ResilientActionConnector } from './types';

describe('ResilientActionConnectorFields renders', () => {
  test('alerting Resilient connector fields is rendered', () => {
    const actionConnector = {
      secrets: {
        apiKeyId: 'key',
        apiKeySecret: 'secret',
      },
      id: 'test',
      actionTypeId: '.resilient',
      isPreconfigured: false,
      name: 'resilient',
      config: {
        apiUrl: 'https://test/',
        orgId: '201',
      },
    } as ResilientActionConnector;
    const deps = {
      docLinks: { ELASTIC_WEBSITE_URL: '', DOC_LINK_VERSION: '' } as DocLinksStart,
    };
    const wrapper = mountWithIntl(
      <ResilientConnectorFields
        action={actionConnector}
        errors={{ apiUrl: [], apiKeyId: [], apiKeySecret: [], orgId: [] }}
        editActionConfig={() => {}}
        editActionSecrets={() => {}}
        docLinks={deps!.docLinks}
        readOnly={false}
      />
    );

    expect(wrapper.find('[data-test-subj="apiUrlFromInput"]').length > 0).toBeTruthy();
    expect(
      wrapper.find('[data-test-subj="connector-resilient-orgId-form-input"]').length > 0
    ).toBeTruthy();

    expect(
      wrapper.find('[data-test-subj="connector-resilient-apiKeySecret-form-input"]').length > 0
    ).toBeTruthy();

    expect(
      wrapper.find('[data-test-subj="connector-resilient-apiKeySecret-form-input"]').length > 0
    ).toBeTruthy();
  });

  test('case specific Resilient connector fields is rendered', () => {
    const actionConnector = {
      secrets: {
        apiKeyId: 'email',
        apiKeySecret: 'token',
      },
      id: 'test',
      actionTypeId: '.resilient',
      isPreconfigured: false,
      name: 'resilient',
      config: {
        apiUrl: 'https://test/',
        orgId: '201',
      },
    } as ResilientActionConnector;
    const deps = {
      docLinks: { ELASTIC_WEBSITE_URL: '', DOC_LINK_VERSION: '' } as DocLinksStart,
    };
    const wrapper = mountWithIntl(
      <ResilientConnectorFields
        action={actionConnector}
        errors={{ apiUrl: [], apiKeyId: [], apiKeySecret: [], orgId: [] }}
        editActionConfig={() => {}}
        editActionSecrets={() => {}}
        docLinks={deps!.docLinks}
        readOnly={false}
        consumer={'case'}
      />
    );

    expect(wrapper.find('[data-test-subj="case-resilient-mappings"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="apiUrlFromInput"]').length > 0).toBeTruthy();
    expect(
      wrapper.find('[data-test-subj="connector-resilient-orgId-form-input"]').length > 0
    ).toBeTruthy();

    expect(
      wrapper.find('[data-test-subj="connector-resilient-apiKeySecret-form-input"]').length > 0
    ).toBeTruthy();

    expect(
      wrapper.find('[data-test-subj="connector-resilient-apiKeySecret-form-input"]').length > 0
    ).toBeTruthy();
  });
});
