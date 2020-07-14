/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { mountWithIntl } from 'test_utils/enzyme_helpers';
import WebhookParamsFields from './webhook_params';
import { DocLinksStart } from 'kibana/public';

describe('WebhookParamsFields renders', () => {
  test('all params fields is rendered', () => {
    const actionParams = {
      body: 'test message',
    };
    const wrapper = mountWithIntl(
      <WebhookParamsFields
        actionParams={actionParams}
        errors={{ body: [] }}
        editAction={() => {}}
        index={0}
        docLinks={{ ELASTIC_WEBSITE_URL: '', DOC_LINK_VERSION: '' } as DocLinksStart}
      />
    );
    expect(wrapper.find('[data-test-subj="bodyJsonEditor"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="bodyJsonEditor"]').first().prop('value')).toStrictEqual(
      'test message'
    );
    expect(wrapper.find('[data-test-subj="bodyAddVariableButton"]').length > 0).toBeTruthy();
  });
});
