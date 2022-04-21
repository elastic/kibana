/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount, ReactWrapper } from 'enzyme';
import { waitFor, act, render, screen } from '@testing-library/react';
import { EuiSelect } from '@elastic/eui';

import { useKibana } from '../../../common/lib/kibana';
import { connector, choices as mockChoices } from '../mock';
import { Choice } from './types';
import Fields from './servicenow_sir_case_fields';

let onChoicesSuccess = (_c: Choice[]) => {};

jest.mock('../../../common/lib/kibana');
jest.mock('./use_get_choices', () => ({
  useGetChoices: (args: { onSuccess: () => void }) => {
    onChoicesSuccess = args.onSuccess;
    return { isLoading: false, mockChoices };
  },
}));

const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;

describe('ServiceNowSIR Fields', () => {
  const fields = {
    destIp: true,
    sourceIp: true,
    malwareHash: true,
    malwareUrl: true,
    priority: '1',
    category: 'Denial of Service',
    subcategory: '26',
  };
  const onChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useKibanaMock().services.triggersActionsUi.actionTypeRegistry.get = jest.fn().mockReturnValue({
      actionTypeTitle: '.servicenow-sir',
      iconClass: 'logoSecurity',
    });
  });

  it('all params fields are rendered - isEdit: true', () => {
    const wrapper = mount(<Fields fields={fields} onChange={onChange} connector={connector} />);
    act(() => {
      onChoicesSuccess(mockChoices);
    });
    wrapper.update();
    expect(wrapper.find('[data-test-subj="destIpCheckbox"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="sourceIpCheckbox"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="malwareUrlCheckbox"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="malwareHashCheckbox"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="prioritySelect"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="categorySelect"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="subcategorySelect"]').exists()).toBeTruthy();
  });

  test('all params fields are rendered - isEdit: false', () => {
    const wrapper = mount(
      <Fields isEdit={false} fields={fields} onChange={onChange} connector={connector} />
    );
    act(() => {
      onChoicesSuccess(mockChoices);
    });
    wrapper.update();

    expect(wrapper.find('[data-test-subj="card-list-item"]').at(0).text()).toEqual(
      'Destination IPs: Yes'
    );
    expect(wrapper.find('[data-test-subj="card-list-item"]').at(1).text()).toEqual(
      'Source IPs: Yes'
    );
    expect(wrapper.find('[data-test-subj="card-list-item"]').at(2).text()).toEqual(
      'Malware URLs: Yes'
    );
    expect(wrapper.find('[data-test-subj="card-list-item"]').at(3).text()).toEqual(
      'Malware Hashes: Yes'
    );
    expect(wrapper.find('[data-test-subj="card-list-item"]').at(4).text()).toEqual(
      'Priority: 1 - Critical'
    );
    expect(wrapper.find('[data-test-subj="card-list-item"]').at(5).text()).toEqual(
      'Category: Denial of Service'
    );
    expect(wrapper.find('[data-test-subj="card-list-item"]').at(6).text()).toEqual(
      'Subcategory: Single or distributed (DoS or DDoS)'
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
        text: 'Software',
        value: 'software',
      },
      {
        text: 'Failed Login',
        value: 'failed_login',
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
        text: 'Inbound or outbound',
        value: '12',
      },
      {
        text: 'Single or distributed (DoS or DDoS)',
        value: '26',
      },
      {
        text: 'Inbound DDos',
        value: 'inbound_ddos',
      },
    ]);
  });

  test('it transforms the priorities to options correctly', async () => {
    const wrapper = mount(<Fields fields={fields} onChange={onChange} connector={connector} />);
    act(() => {
      onChoicesSuccess(mockChoices);
    });

    wrapper.update();
    expect(wrapper.find('[data-test-subj="prioritySelect"]').first().prop('options')).toEqual([
      {
        text: '1 - Critical',
        value: '1',
      },
      {
        text: '2 - High',
        value: '2',
      },
      {
        text: '3 - Moderate',
        value: '3',
      },
      {
        text: '4 - Low',
        value: '4',
      },
    ]);
  });

  test('it shows the deprecated callout when the connector uses the table API', async () => {
    const tableApiConnector = { ...connector, config: { usesTableApi: true } };
    render(<Fields fields={fields} onChange={onChange} connector={tableApiConnector} />);
    expect(screen.getByTestId('deprecated-connector-warning-callout')).toBeInTheDocument();
  });

  test('it does not show the deprecated callout when the connector does not uses the table API', async () => {
    render(<Fields fields={fields} onChange={onChange} connector={connector} />);
    expect(screen.queryByTestId('deprecated-connector-warning-callout')).not.toBeInTheDocument();
  });

  test('it should hide subcategory if selecting a category without subcategories', async () => {
    // Failed Login doesn't have defined subcategories
    const customFields = {
      ...fields,
      category: 'Failed Login',
      subcategory: '',
    };
    const wrapper = mount(
      <Fields fields={customFields} onChange={onChange} connector={connector} />
    );

    expect(wrapper.find('[data-test-subj="subcategorySelect"]').exists()).toBeFalsy();
  });

  describe('onChange calls', () => {
    let wrapper: ReactWrapper;

    beforeEach(() => {
      wrapper = mount(<Fields fields={fields} onChange={onChange} connector={connector} />);
      act(() => {
        onChoicesSuccess(mockChoices);
      });
      wrapper.update();
      expect(onChange).toHaveBeenCalledWith(fields);
    });

    const checkbox = ['destIp', 'sourceIp', 'malwareHash', 'malwareUrl'];
    checkbox.forEach((subj) =>
      test(`${subj.toUpperCase()}`, async () => {
        await waitFor(() => {
          wrapper
            .find(`[data-test-subj="${subj}Checkbox"] input`)
            .first()
            .simulate('change', { target: { checked: false } });
          expect(onChange).toHaveBeenCalledWith({
            ...fields,
            [subj]: false,
          });
        });
      })
    );

    const testers = ['priority', 'subcategory'];
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
      const select = wrapper.find(EuiSelect).filter(`[data-test-subj="categorySelect"]`)!;
      select.prop('onChange')!({
        target: {
          value: 'network',
        },
      } as React.ChangeEvent<HTMLSelectElement>);

      wrapper.update();

      await waitFor(() => {
        expect(onChange).toHaveBeenCalledWith({
          ...fields,
          subcategory: null,
          category: 'network',
        });
      });
    });
  });
});
