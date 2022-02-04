/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount, ReactWrapper } from 'enzyme';
import { EuiComboBox } from '@elastic/eui';
import { act, fireEvent, render, screen } from '@testing-library/react';

import { ConnectorsDropdown, Props } from './connectors_dropdown';
import { TestProviders } from '../../common/mock';
import { connectors } from './__mock__';
import { useKibana } from '../../common/lib/kibana';
import { registerConnectorsToMockActionRegistry } from '../../common/mock/register_connectors';
import userEvent from '@testing-library/user-event';

jest.mock('../../common/lib/kibana');
const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;

describe('ConnectorsDropdown', () => {
  let wrapper: ReactWrapper;
  const props: Props = {
    disabled: false,
    connectors,
    isLoading: false,
    onChange: jest.fn(),
    selectedConnector: 'none',
  };

  const actionTypeRegistry = useKibanaMock().services.triggersActionsUi.actionTypeRegistry;

  beforeAll(() => {
    registerConnectorsToMockActionRegistry(actionTypeRegistry, connectors);
    wrapper = mount(<ConnectorsDropdown {...props} />, { wrappingComponent: TestProviders });
  });

  it('renders', () => {
    expect(wrapper.find('[data-test-subj="dropdown-connectors"]').first().exists()).toBe(true);
  });

  it('formats the connectors correctly', () => {
    const selectProps = wrapper.find(EuiComboBox).props();

    expect(selectProps.options).toMatchSnapshot();
  });

  it('disables the dropdown', () => {
    const newWrapper = mount(<ConnectorsDropdown {...props} disabled={true} />, {
      wrappingComponent: TestProviders,
    });

    expect(
      newWrapper.find('[data-test-subj="dropdown-connectors"]').first().prop('isDisabled')
    ).toEqual(true);
  });

  it('shows loading correctly', () => {
    const newWrapper = mount(<ConnectorsDropdown {...props} isLoading={true} />, {
      wrappingComponent: TestProviders,
    });

    expect(
      newWrapper.find('[data-test-subj="dropdown-connectors"]').first().prop('isLoading')
    ).toEqual(true);
  });

  it('selects the previously selected connector correctly', () => {
    const newWrapper = mount(<ConnectorsDropdown {...props} selectedConnector={'servicenow-1'} />, {
      wrappingComponent: TestProviders,
    });

    expect(newWrapper.find('[data-test-subj="dropdown-connectors"]').first().text()).toBe(
      'My Connector'
    );
  });

  it('does not throw when accessing the icon if the connector type is not registered', () => {
    expect(() =>
      mount(
        <ConnectorsDropdown
          {...props}
          connectors={[
            {
              id: 'none',
              actionTypeId: '.none',
              name: 'None',
              config: {},
              isPreconfigured: false,
            },
          ]}
        />,
        {
          wrappingComponent: TestProviders,
        }
      )
    ).not.toThrowError();
  });

  it('shows the deprecated tooltip when the connector is deprecated', () => {
    render(<ConnectorsDropdown {...props} selectedConnector="servicenow-uses-table-api" />, {
      wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
    });

    userEvent.click(screen.getByTestId('comboBoxToggleListButton'));

    const tooltips = screen.getAllByLabelText(
      'This connector is deprecated. Update it, or create a new one.'
    );
    expect(tooltips[0]).toBeInTheDocument();
  });

  it('restores the previous connector if the user leaves the input empty', () => {
    const onChangeHandler = jest.fn();
    render(
      <ConnectorsDropdown {...props} selectedConnector="jira-1" onChange={onChangeHandler} />,
      {
        wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
      }
    );

    userEvent.click(screen.getByTestId('comboBoxClearButton'));
    act(() => {
      screen.getByTestId('comboBoxSearchInput').blur();
    });

    expect(screen.getByTestId('comboBoxInput')).toHaveTextContent(/Jira/);
    expect(onChangeHandler).toHaveBeenLastCalledWith('jira-1');
  });

  it('shows the add connector button when appendAddConnectorButton is passed', () => {
    render(<ConnectorsDropdown {...props} appendAddConnectorButton={true} />, {
      wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
    });

    userEvent.click(screen.getByTestId('comboBoxToggleListButton'));

    expect(screen.getByTestId('dropdown-connector-add-connector')).toBeTruthy();
  });
});
