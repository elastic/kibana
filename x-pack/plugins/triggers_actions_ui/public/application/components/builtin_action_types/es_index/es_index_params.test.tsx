/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test/jest';
import ParamsFields from './es_index_params';
jest.mock('../../../../common/lib/kibana');

describe('IndexParamsFields renders', () => {
  test('all params fields is rendered', () => {
    const actionParams = {
      documents: [{ test: 123 }],
    };

    const wrapper = mountWithIntl(
      <ParamsFields
        actionParams={actionParams}
        errors={{ index: [] }}
        editAction={() => {}}
        index={0}
      />
    );
    expect(wrapper.find('[data-test-subj="documentsJsonEditor"]').first().prop('value')).toBe(`{
  "test": 123
}`);
    expect(wrapper.find('[data-test-subj="documentsAddVariableButton"]').length > 0).toBeTruthy();
  });
});
