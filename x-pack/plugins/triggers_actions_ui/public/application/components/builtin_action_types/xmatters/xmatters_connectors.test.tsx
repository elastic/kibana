/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import XmattersActionConnectorFields from './xmatters_connectors';
import { FormTestProvider, waitForComponentToUpdate } from '../test_utils';

describe('XmattersActionConnectorFields renders', () => {
  test('all connector fields is rendered', async () => {
    const actionConnector = {
      actionTypeId: '.xmatters',
      name: 'xmatters',
      config: {
        configUrl: 'http:\\test',
        usesBasic: true,
      },
      secrets: {
        user: 'user',
        password: 'pass',
      },
    };

    const wrapper = mountWithIntl(
      <FormTestProvider connector={actionConnector}>
        <XmattersActionConnectorFields
          readOnly={false}
          isEdit={false}
          registerPreSubmitValidator={() => {}}
        />
      </FormTestProvider>
    );

    await waitForComponentToUpdate();

    expect(wrapper.find('[data-test-subj="config.configUrl"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="xmattersUserInput"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="xmattersPasswordInput"]').length > 0).toBeTruthy();
  });

  test('should show only basic auth info when basic selected', () => {
    const actionConnector = {
      id: 'test',
      actionTypeId: '.xmatters',
      name: 'xmatters',
      config: {
        configUrl: 'http:\\test',
        usesBasic: true,
      },
      secrets: {
        user: 'user',
        password: 'pass',
      },
    };

    const wrapper = mountWithIntl(
      <FormTestProvider connector={actionConnector}>
        <XmattersActionConnectorFields
          readOnly={false}
          isEdit={false}
          registerPreSubmitValidator={() => {}}
        />
      </FormTestProvider>
    );

    expect(wrapper.find('[data-test-subj="config.configUrl"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="xmattersUserInput"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="xmattersPasswordInput"]').length > 0).toBeTruthy();
  });

  test('should show only url auth info when url selected', () => {
    const actionConnector = {
      secrets: {
        secretsUrl: 'http:\\test',
      },
      id: 'test',
      actionTypeId: '.xmatters',
      isPreconfigured: false,
      isDeprecated: false,
      name: 'xmatters',
      config: {
        usesBasic: false,
      },
    };

    const wrapper = mountWithIntl(
      <FormTestProvider connector={actionConnector}>
        <XmattersActionConnectorFields
          readOnly={false}
          isEdit={false}
          registerPreSubmitValidator={() => {}}
        />
      </FormTestProvider>
    );

    expect(wrapper.find('[data-test-subj="secrets.secretsUrl"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="xmattersUserInput"]').length === 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="xmattersPasswordInput"]').length === 0).toBeTruthy();
  });
});
