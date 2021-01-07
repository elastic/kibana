/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { mountWithIntl } from '@kbn/test/jest';
import { SeverityActionOptions } from '../types';
import SwimlaneParamsFields from './swimlane_params';

describe('SwimlaneParamsFields renders', () => {
  test('all params fields is rendered', () => {
    const actionParams = {
      alertName: 'alert name',
      tags: ['tag1'],
      comments: 'my comments',
      severity: SeverityActionOptions.CRITICAL,
    };

    const wrapper = mountWithIntl(
      <SwimlaneParamsFields
        actionParams={actionParams}
        errors={{ alertName: [], tags: [], comments: [] }}
        editAction={() => {}}
        index={0}
      />
    );
    expect(wrapper.find('[data-test-subj="severitySelect"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="severitySelect"]').first().prop('value')).toStrictEqual(
      'critical'
    );
  });
});
