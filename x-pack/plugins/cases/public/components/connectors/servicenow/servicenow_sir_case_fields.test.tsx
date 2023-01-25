/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ReactWrapper } from 'enzyme';
import { mount } from 'enzyme';
import { waitFor, act, render, screen } from '@testing-library/react';
import { EuiSelect } from '@elastic/eui';
import userEvent from '@testing-library/user-event';

import { useKibana } from '../../../common/lib/kibana';
import { connector, choices as mockChoices } from '../mock';
import type { Choice } from './types';
import Fields from './servicenow_sir_case_fields';
import type { AppMockRenderer } from '../../../common/mock';
import { createAppMockRenderer } from '../../../common/mock';

let onChoicesSuccess = (_c: Choice[]) => {};

jest.mock('../../../common/lib/kibana');
jest.mock('./use_get_choices', () => ({
  useGetChoices: (args: { onSuccess: () => void }) => {
    onChoicesSuccess = args.onSuccess;
    return { isLoading: false, mockChoices };
  },
}));

const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;
let mockedContext: AppMockRenderer;

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
    mockedContext = createAppMockRenderer();
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
    const nodes = wrapper.find('[data-test-subj="card-list-item"]').hostNodes();

    expect(nodes.at(0).text()).toEqual('Destination IPs: Yes');
    expect(nodes.at(1).text()).toEqual('Source IPs: Yes');
    expect(nodes.at(2).text()).toEqual('Malware URLs: Yes');
    expect(nodes.at(3).text()).toEqual('Malware Hashes: Yes');
    expect(nodes.at(4).text()).toEqual('Priority: 1 - Critical');
    expect(nodes.at(5).text()).toEqual('Category: Denial of Service');
    expect(nodes.at(6).text()).toEqual('Subcategory: Single or distributed (DoS or DDoS)');
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

  test('shows the deprecated callout if the connector is deprecated', async () => {
    const tableApiConnector = { ...connector, isDeprecated: true };
    render(<Fields fields={fields} onChange={onChange} connector={tableApiConnector} />);
    expect(screen.getByTestId('deprecated-connector-warning-callout')).toBeInTheDocument();
  });

  test('does not show the deprecated callout when the connector is not deprecated', async () => {
    render(<Fields fields={fields} onChange={onChange} connector={connector} />);
    expect(screen.queryByTestId('deprecated-connector-warning-callout')).not.toBeInTheDocument();
  });

  it('does not show the deprecated callout when the connector is preconfigured and not deprecated', async () => {
    render(
      <Fields
        fields={fields}
        onChange={onChange}
        connector={{ ...connector, isPreconfigured: true }}
      />
    );
    expect(screen.queryByTestId('deprecated-connector-warning-callout')).not.toBeInTheDocument();
  });

  it('shows the deprecated callout when the connector is preconfigured and deprecated', async () => {
    render(
      <Fields
        fields={fields}
        onChange={onChange}
        connector={{ ...connector, isPreconfigured: true, isDeprecated: true }}
      />
    );
    expect(screen.queryByTestId('deprecated-connector-warning-callout')).toBeInTheDocument();
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

  it('should submit servicenow sir connector', async () => {
    const { rerender } = mockedContext.render(
      <Fields fields={fields} onChange={onChange} connector={connector} />
    );

    act(() => {
      onChoicesSuccess(mockChoices);
    });

    userEvent.click(screen.getByTestId('destIpCheckbox'));

    await waitFor(() => {
      expect(screen.getByRole('option', { name: '1 - Critical' }));
      expect(screen.getByRole('option', { name: 'Denial of Service' }));
    });

    userEvent.selectOptions(screen.getByTestId('prioritySelect'), ['1']);

    rerender(
      <Fields fields={{ ...fields, priority: '1' }} onChange={onChange} connector={connector} />
    );

    userEvent.selectOptions(screen.getByTestId('categorySelect'), ['Denial of Service']);

    rerender(
      <Fields
        fields={{ ...fields, priority: '1', category: 'Denial of Service' }}
        onChange={onChange}
        connector={connector}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Single or distributed (DoS or DDoS)' }));
    });

    userEvent.selectOptions(screen.getByTestId('subcategorySelect'), ['26']);

    await waitFor(() => {
      expect(onChange).toHaveBeenCalled();
    });

    expect(onChange).toBeCalledWith({
      destIp: false,
      sourceIp: true,
      malwareHash: true,
      malwareUrl: true,
      priority: '1',
      category: 'Denial of Service',
      subcategory: '26',
    });
  });
});
