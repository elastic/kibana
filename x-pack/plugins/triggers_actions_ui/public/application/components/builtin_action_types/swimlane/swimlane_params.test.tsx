/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test/jest';
import SwimlaneParamsFields from './swimlane_params';

describe('SwimlaneParamsFields renders', () => {
  test('all params fields is rendered', () => {
    const actionParams = {
      subActionParams: {
        alertName: 'alert name',
        alertSource: 'alert source',
        caseId: '3456789',
        caseName: 'my case name',
        comments: 'my comments',
        severity: 'critical',
      },
    };

    const wrapper = mountWithIntl(
      <SwimlaneParamsFields
        actionParams={actionParams}
        errors={{
          alertName: [],
          comments: [],
          severity: [],
          caseId: [],
          caseName: [],
          alertSource: [],
        }}
        editAction={() => {}}
        index={0}
      />
    );
    expect(wrapper.find('[data-test-subj="severity"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="caseId"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="caseName"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="comments"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="alertSource"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="alertName"]').length > 0).toBeTruthy();
  });
});
