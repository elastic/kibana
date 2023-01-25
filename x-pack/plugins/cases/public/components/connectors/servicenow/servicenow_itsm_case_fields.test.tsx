/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { waitFor, act, render, screen, within } from '@testing-library/react';
import { EuiSelect } from '@elastic/eui';
import { mount } from 'enzyme';
import userEvent from '@testing-library/user-event';

import { useKibana } from '../../../common/lib/kibana';
import { connector, choices as mockChoices } from '../mock';
import type { Choice } from './types';
import Fields from './servicenow_itsm_case_fields';
import type { AppMockRenderer } from '../../../common/mock';
import { createAppMockRenderer } from '../../../common/mock';

let onChoicesSuccess = (c: Choice[]) => {};

jest.mock('../../../common/lib/kibana');
jest.mock('./use_get_choices', () => ({
  useGetChoices: (args: { onSuccess: () => void }) => {
    onChoicesSuccess = args.onSuccess;
    return { isLoading: false, choices: mockChoices };
  },
}));

const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;
let mockedContext: AppMockRenderer;

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
    mockedContext = createAppMockRenderer();
    useKibanaMock().services.triggersActionsUi.actionTypeRegistry.get = jest.fn().mockReturnValue({
      actionTypeTitle: '.servicenow',
      iconClass: 'logoSecurity',
    });
    jest.clearAllMocks();
  });

  it('all params fields are rendered - isEdit: true', () => {
    const wrapper = mount(<Fields fields={fields} onChange={onChange} connector={connector} />);
    act(() => {
      onChoicesSuccess(mockChoices);
    });
    wrapper.update();
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

    const nodes = wrapper.find('[data-test-subj="card-list-item"]').hostNodes();

    expect(nodes.at(0).text()).toEqual('Urgency: 2 - High');
    expect(nodes.at(1).text()).toEqual('Severity: 1 - Critical');
    expect(nodes.at(2).text()).toEqual('Impact: 3 - Moderate');
  });

  it('transforms the categories to options correctly', async () => {
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
      {
        text: 'Failed Login',
        value: 'failed_login',
      },
    ]);
  });

  it('transforms the subcategories to options correctly', async () => {
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

  it('transforms the options correctly', async () => {
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

  it('shows the deprecated callout if the connector is deprecated', async () => {
    const tableApiConnector = { ...connector, isDeprecated: true };
    render(<Fields fields={fields} onChange={onChange} connector={tableApiConnector} />);
    expect(screen.getByTestId('deprecated-connector-warning-callout')).toBeInTheDocument();
  });

  it('does not show the deprecated callout when the connector is not deprecated', async () => {
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

  it('should hide subcategory if selecting a category without subcategories', async () => {
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
    const wrapper = mount(<Fields fields={fields} onChange={onChange} connector={connector} />);
    act(() => {
      onChoicesSuccess(mockChoices);
    });
    wrapper.update();

    expect(onChange).toHaveBeenCalledWith(fields);

    const testers = ['severity', 'urgency', 'impact', 'subcategory'];
    testers.forEach((subj) =>
      it(`${subj.toUpperCase()}`, async () => {
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

    it('should set subcategory to null when changing category', async () => {
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

  it('should submit a service now itsm connector', async () => {
    const { rerender } = mockedContext.render(
      <Fields fields={fields} onChange={onChange} connector={connector} />
    );

    act(() => {
      onChoicesSuccess(mockChoices);
    });

    const severitySelect = screen.getByTestId('severitySelect');
    const urgencySelect = screen.getByTestId('urgencySelect');
    const impactSelect = screen.getByTestId('impactSelect');

    await waitFor(() => {
      expect(within(severitySelect).getByRole('option', { name: '2 - High' }));
      expect(within(urgencySelect).getByRole('option', { name: '2 - High' }));
      expect(within(impactSelect).getByRole('option', { name: '2 - High' }));

      expect(screen.getByRole('option', { name: 'Software' }));
    });

    const selectables: Array<[HTMLElement, 'severity' | 'urgency' | 'impact']> = [
      [severitySelect, 'severity'],
      [urgencySelect, 'urgency'],
      [impactSelect, 'impact'],
    ];

    let newFields = { ...fields };

    selectables.forEach(([element, key]) => {
      userEvent.selectOptions(element, ['2']);

      rerender(
        <Fields fields={{ ...newFields, [key]: '2' }} onChange={onChange} connector={connector} />
      );

      newFields = { ...newFields, [key]: '2' };
    });

    const categorySelect = screen.getByTestId('categorySelect');

    await waitFor(() => {
      expect(within(categorySelect).getByRole('option', { name: 'Software' }));
    });

    userEvent.selectOptions(categorySelect, ['software']);

    rerender(
      <Fields
        fields={{ ...newFields, category: 'software' }}
        onChange={onChange}
        connector={connector}
      />
    );

    const subcategorySelect = screen.getByTestId('subcategorySelect');

    await waitFor(() => {
      expect(within(subcategorySelect).getByRole('option', { name: 'Operation System' }));
    });

    userEvent.selectOptions(subcategorySelect, ['os']);

    await waitFor(() => {
      expect(onChange).toHaveBeenCalled();
    });

    expect(onChange).toBeCalledWith({
      impact: '2',
      severity: '2',
      urgency: '2',
      category: 'software',
      subcategory: 'os',
    });
  });
});
