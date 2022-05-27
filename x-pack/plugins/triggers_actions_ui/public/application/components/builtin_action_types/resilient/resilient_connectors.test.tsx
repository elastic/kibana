/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import ResilientConnectorFields from './resilient_connectors';
import { FormTestProvider } from '../test_utils';

jest.mock('../../../../common/lib/kibana');

describe('ResilientActionConnectorFields renders', () => {
  test('alerting Resilient connector fields are rendered', () => {
    const actionConnector = {
      actionTypeId: '.resilient',
      name: 'resilient',
      config: {
        apiUrl: 'https://test/',
        orgId: '201',
      },
      secrets: {
        apiKeyId: 'key',
        apiKeySecret: 'secret',
      },
      isDeprecated: false,
    };

    const wrapper = mountWithIntl(
      <FormTestProvider connector={actionConnector}>
        <ResilientConnectorFields
          readOnly={false}
          isEdit={false}
          registerPreSubmitValidator={() => {}}
        />
      </FormTestProvider>
    );

    expect(wrapper.find('[data-test-subj="config.apiUrl-input"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="config.orgId-input"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="secrets.apiKeyId-input"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="secrets.apiKeySecret-input"]').length > 0).toBeTruthy();
  });
});
