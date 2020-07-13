/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { mountWithIntl } from 'test_utils/enzyme_helpers';
import ParamsFields from './es_index_params';

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
