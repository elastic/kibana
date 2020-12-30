/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mount } from 'enzyme';
import Fields from './fields';
import { connector } from '../mock';
import { waitFor } from '@testing-library/dom';
import { EuiSelect } from '@elastic/eui';

describe('ServiceNow Fields', () => {
  const fields = { severity: '1', urgency: '2', impact: '3' };
  const onChange = jest.fn();
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('all params fields are rendered - isEdit: true', () => {
    const wrapper = mount(<Fields fields={fields} onChange={onChange} connector={connector} />);
    expect(wrapper.find('[data-test-subj="severitySelect"]').first().prop('value')).toEqual('1');
    expect(wrapper.find('[data-test-subj="urgencySelect"]').first().prop('value')).toEqual('2');
    expect(wrapper.find('[data-test-subj="impactSelect"]').first().prop('value')).toEqual('3');
  });

  test('all params fields are rendered - isEdit: false', () => {
    const wrapper = mount(
      <Fields isEdit={false} fields={fields} onChange={onChange} connector={connector} />
    );
    expect(wrapper.find('[data-test-subj="card-list-item"]').at(0).text()).toEqual(
      'Urgency: Medium'
    );
    expect(wrapper.find('[data-test-subj="card-list-item"]').at(1).text()).toEqual(
      'Severity: High'
    );
    expect(wrapper.find('[data-test-subj="card-list-item"]').at(2).text()).toEqual('Impact: Low');
  });

  describe('onChange calls', () => {
    const wrapper = mount(<Fields fields={fields} onChange={onChange} connector={connector} />);

    expect(onChange).toHaveBeenCalledWith(fields);

    const testers = ['severity', 'urgency', 'impact'];
    testers.forEach((subj) =>
      test(`${subj.toUpperCase()}`, async () => {
        await waitFor(() => {
          const select = wrapper.find(EuiSelect).filter(`[data-test-subj="${subj}Select"]`)!;
          select.prop('onChange')!({
            target: {
              value: '9',
            },
          } as React.ChangeEvent<HTMLSelectElement>);
        });
        wrapper.update();
        expect(onChange).toHaveBeenCalledWith({
          ...fields,
          [subj]: '9',
        });
      })
    );
  });
});
