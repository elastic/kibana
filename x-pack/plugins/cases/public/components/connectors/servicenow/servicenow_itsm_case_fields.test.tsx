/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { waitFor, act } from '@testing-library/react';
import { EuiSelect } from '@elastic/eui';
import { mount } from 'enzyme';

import { connector, choices as mockChoices } from '../mock';
import { Choice } from './types';
import Fields from './servicenow_itsm_case_fields';

let onChoicesSuccess = (c: Choice[]) => {};

jest.mock('../../../common/lib/kibana');
jest.mock('./use_get_choices', () => ({
  useGetChoices: (args: { onSuccess: () => void }) => {
    onChoicesSuccess = args.onSuccess;
    return { isLoading: false, choices: mockChoices };
  },
}));

describe('ServiceNowITSM Fields', () => {
  const fields = {
    severity: '1',
    urgency: '2',
    impact: '3',
    category: 'software',
    subcategory: 'os',
  };
  const onChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('all params fields are rendered - isEdit: true', () => {
    const wrapper = mount(<Fields fields={fields} onChange={onChange} connector={connector} />);
    expect(wrapper.find('[data-test-subj="severitySelect"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="urgencySelect"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="impactSelect"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="categorySelect"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="subcategorySelect"]').exists()).toBeTruthy();
  });

  it('all params fields are rendered - isEdit: false', () => {
    const wrapper = mount(
      <Fields isEdit={false} fields={fields} onChange={onChange} connector={connector} />
    );
    act(() => {
      onChoicesSuccess(mockChoices);
    });

    expect(wrapper.find('[data-test-subj="card-list-item"]').at(0).text()).toEqual(
      'Urgency: 2 - High'
    );
    expect(wrapper.find('[data-test-subj="card-list-item"]').at(1).text()).toEqual(
      'Severity: 1 - Critical'
    );
    expect(wrapper.find('[data-test-subj="card-list-item"]').at(2).text()).toEqual(
      'Impact: 3 - Moderate'
    );
  });

  test('it transforms the categories to options correctly', async () => {
    const wrapper = mount(<Fields fields={fields} onChange={onChange} connector={connector} />);
    act(() => {
      onChoicesSuccess(mockChoices);
    });

    wrapper.update();
    expect(wrapper.find('[data-test-subj="categorySelect"]').first().prop('options')).toEqual([
      { value: 'Priviledge Escalation', text: 'Priviledge Escalation' },
      {
        value: 'Criminal activity/investigation',
        text: 'Criminal activity/investigation',
      },
      { value: 'Denial of Service', text: 'Denial of Service' },
      {
        value: 'software',
        text: 'Software',
      },
    ]);
  });

  test('it transforms the subcategories to options correctly', async () => {
    const wrapper = mount(<Fields fields={fields} onChange={onChange} connector={connector} />);
    act(() => {
      onChoicesSuccess(mockChoices);
    });

    wrapper.update();
    expect(wrapper.find('[data-test-subj="subcategorySelect"]').first().prop('options')).toEqual([
      {
        text: 'Operation System',
        value: 'os',
      },
    ]);
  });

  it('it transforms the options correctly', async () => {
    const wrapper = mount(<Fields fields={fields} onChange={onChange} connector={connector} />);
    act(() => {
      onChoicesSuccess(mockChoices);
    });

    wrapper.update();
    const testers = ['severity', 'urgency', 'impact'];
    testers.forEach((subj) =>
      expect(wrapper.find(`[data-test-subj="${subj}Select"]`).first().prop('options')).toEqual([
        { value: '1', text: '1 - Critical' },
        { value: '2', text: '2 - High' },
        { value: '3', text: '3 - Moderate' },
        { value: '4', text: '4 - Low' },
      ])
    );
  });

  describe('onChange calls', () => {
    const wrapper = mount(<Fields fields={fields} onChange={onChange} connector={connector} />);

    expect(onChange).toHaveBeenCalledWith(fields);

    const testers = ['severity', 'urgency', 'impact', 'subcategory'];
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

    test('it should set subcategory to null when changing category', async () => {
      await waitFor(() => {
        const select = wrapper.find(EuiSelect).filter(`[data-test-subj="categorySelect"]`)!;
        select.prop('onChange')!({
          target: {
            value: 'network',
          },
        } as React.ChangeEvent<HTMLSelectElement>);
      });
      wrapper.update();
      expect(onChange).toHaveBeenCalledWith({
        ...fields,
        subcategory: null,
        category: 'network',
      });
    });
  });
});
