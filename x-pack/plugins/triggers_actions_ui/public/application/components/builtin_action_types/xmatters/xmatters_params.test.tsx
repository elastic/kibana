/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test/jest';
import { XmattersSeverityOptions } from '../types';
import XmattersParamsFields from './xmatters_params';

describe('XmattersParamsFields renders', () => {
  test('all params fields is rendered', () => {
    const actionParams = {
      alertActionGroupName: 'Small t-shirt',
      alertId: 'c9437cab-6a5b-45e8-bc8a-f4a8af440e97',
      alertName: 'Test xMatters',
      date: new Date().toISOString(),
      severity: XmattersSeverityOptions.HIGH,
      spaceId: 'default',
      tags: 'test1, test2',
    };

    const wrapper = mountWithIntl(
      <XmattersParamsFields
        actionParams={actionParams}
        errors={{
          alertActionGroupName: [],
          alertId: [],
        }}
        editAction={() => {}}
        index={0}
        messageVariables={[
          {
            name: 'myVar',
            description: 'My variable description',
            useWithTripleBracesInTemplates: true,
          },
        ]}
      />
    );
    expect(wrapper.find('[data-test-subj="alertActionGroupNameInput"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="alertIdInput"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="alertNameInput"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="dateInput"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="severitySelect"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="spaceIdInput"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="tagsInput"]').length > 0).toBeTruthy();

    expect(
      wrapper.find('[data-test-subj="alertActionGroupNameInput"]').first().prop('value')
    ).toStrictEqual('');
    expect(wrapper.find('[data-test-subj="alertIdInput"]').first().prop('value')).toStrictEqual('');
    expect(wrapper.find('[data-test-subj="alertNameInput"]').first().prop('value')).toStrictEqual(
      'Test xMatters'
    );
    expect(wrapper.find('[data-test-subj="severitySelect"]').first().prop('value')).toStrictEqual(
      'high'
    );
    expect(wrapper.find('[data-test-subj="spaceIdInput"]').first().prop('value')).toStrictEqual(
      'default'
    );
    expect(wrapper.find('[data-test-subj="tagsInput"]').first().prop('value')).toStrictEqual(
      'test1, test2'
    );
  });
});
