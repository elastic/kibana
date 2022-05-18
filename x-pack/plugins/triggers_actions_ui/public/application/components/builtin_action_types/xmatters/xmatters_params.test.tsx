/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { XmattersSeverityOptions } from '../types';
import XmattersParamsFields from './xmatters_params';

describe('XmattersParamsFields renders', () => {
  test('all params fields is rendered', () => {
    const actionParams = {
      alertActionGroupName: 'Small t-shirt',
      signalId: 'c9437cab-6a5b-45e8-bc8a-f4a8af440e97',
      ruleName: 'Test xMatters',
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
          signalId: [],
          ruleName: [],
          date: [],
          spaceId: [],
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
    expect(wrapper.find('[data-test-subj="severitySelect"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="tagsInput"]').length > 0).toBeTruthy();

    expect(wrapper.find('[data-test-subj="severitySelect"]').first().prop('value')).toStrictEqual(
      'high'
    );
    expect(wrapper.find('[data-test-subj="tagsInput"]').first().prop('value')).toStrictEqual(
      'test1, test2'
    );
  });
});
