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

  test('it renders', () => {
    expect(wrapper.find('[data-test-subj="dropdown-connectors"]').first().exists()).toBe(true);
  });

  test('it formats the connectors correctly', () => {
    const selectProps = wrapper.find(EuiComboBox).props();

    expect(selectProps.options).toMatchSnapshot();
  });

  test('it disables the dropdown', () => {
    const newWrapper = mount(<ConnectorsDropdown {...props} disabled={true} />, {
      wrappingComponent: TestProviders,
    });

    expect(
      newWrapper.find('[data-test-subj="dropdown-connectors"]').first().prop('isDisabled')
    ).toEqual(true);
  });

  test('it shows loading correctly', () => {
    const newWrapper = mount(<ConnectorsDropdown {...props} isLoading={true} />, {
      wrappingComponent: TestProviders,
    });

    expect(
      newWrapper.find('[data-test-subj="dropdown-connectors"]').first().prop('isLoading')
    ).toEqual(true);
  });

  test('it selects the correct connector', () => {
    const newWrapper = mount(<ConnectorsDropdown {...props} selectedConnector={'servicenow-1'} />, {
      wrappingComponent: TestProviders,
    });

    expect(newWrapper.find('[data-test-subj="dropdown-connectors"]').first().text()).toBe(
      'My Connector'
    );
  });

  test('it does not throw when accessing the icon if the connector type is not registered', () => {
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

  test('it shows the deprecated tooltip when the connector is deprecated', () => {
    render(<ConnectorsDropdown {...props} selectedConnector="servicenow-uses-table-api" />, {
      wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
    });

    act(() => {
      fireEvent(
        screen.getByTestId('comboBoxToggleListButton'),
        new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
        })
      );
    });

    const tooltips = screen.getAllByLabelText(
      'This connector is deprecated. Update it, or create a new one.'
    );
    expect(tooltips[0]).toBeInTheDocument();
  });
});
