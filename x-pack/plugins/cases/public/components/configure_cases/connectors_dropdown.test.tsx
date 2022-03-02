/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount, ReactWrapper } from 'enzyme';
import { EuiSuperSelect } from '@elastic/eui';
import { render, screen } from '@testing-library/react';

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
    const selectProps = wrapper.find(EuiSuperSelect).props();

    expect(selectProps.options).toMatchInlineSnapshot(`
      Array [
        Object {
          "data-test-subj": "dropdown-connector-no-connector",
          "inputDisplay": <EuiFlexGroup
            alignItems="center"
            gutterSize="none"
            responsive={false}
          >
            <EuiFlexItem
              grow={false}
            >
              <Styled(EuiIcon)
                size="m"
                type="minusInCircle"
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <span
                data-test-subj="dropdown-connector-no-connector"
              >
                No connector selected
              </span>
            </EuiFlexItem>
          </EuiFlexGroup>,
          "value": "none",
        },
        Object {
          "data-test-subj": "dropdown-connector-servicenow-1",
          "inputDisplay": <EuiFlexGroup
            alignItems="center"
            gutterSize="s"
            responsive={false}
          >
            <EuiFlexItem
              grow={false}
            >
              <Styled(EuiIcon)
                size="m"
                type="logoSecurity"
              />
            </EuiFlexItem>
            <EuiFlexItem
              grow={false}
            >
              <span>
                My Connector
              </span>
            </EuiFlexItem>
          </EuiFlexGroup>,
          "value": "servicenow-1",
        },
        Object {
          "data-test-subj": "dropdown-connector-resilient-2",
          "inputDisplay": <EuiFlexGroup
            alignItems="center"
            gutterSize="s"
            responsive={false}
          >
            <EuiFlexItem
              grow={false}
            >
              <Styled(EuiIcon)
                size="m"
                type="logoSecurity"
              />
            </EuiFlexItem>
            <EuiFlexItem
              grow={false}
            >
              <span>
                My Connector 2
              </span>
            </EuiFlexItem>
          </EuiFlexGroup>,
          "value": "resilient-2",
        },
        Object {
          "data-test-subj": "dropdown-connector-jira-1",
          "inputDisplay": <EuiFlexGroup
            alignItems="center"
            gutterSize="s"
            responsive={false}
          >
            <EuiFlexItem
              grow={false}
            >
              <Styled(EuiIcon)
                size="m"
                type="logoSecurity"
              />
            </EuiFlexItem>
            <EuiFlexItem
              grow={false}
            >
              <span>
                Jira
              </span>
            </EuiFlexItem>
          </EuiFlexGroup>,
          "value": "jira-1",
        },
        Object {
          "data-test-subj": "dropdown-connector-servicenow-sir",
          "inputDisplay": <EuiFlexGroup
            alignItems="center"
            gutterSize="s"
            responsive={false}
          >
            <EuiFlexItem
              grow={false}
            >
              <Styled(EuiIcon)
                size="m"
                type="logoSecurity"
              />
            </EuiFlexItem>
            <EuiFlexItem
              grow={false}
            >
              <span>
                My Connector SIR
              </span>
            </EuiFlexItem>
          </EuiFlexGroup>,
          "value": "servicenow-sir",
        },
        Object {
          "data-test-subj": "dropdown-connector-servicenow-uses-table-api",
          "inputDisplay": <EuiFlexGroup
            alignItems="center"
            gutterSize="s"
            responsive={false}
          >
            <EuiFlexItem
              grow={false}
            >
              <Styled(EuiIcon)
                size="m"
                type="logoSecurity"
              />
            </EuiFlexItem>
            <EuiFlexItem
              grow={false}
            >
              <span>
                My Connector
                 (deprecated)
              </span>
            </EuiFlexItem>
            <EuiFlexItem
              grow={false}
            >
              <Styled(EuiIconTip)
                aria-label="This connector is deprecated. Update it, or create a new one."
                color="warning"
                content="This connector is deprecated. Update it, or create a new one."
                size="m"
                type="alert"
              />
            </EuiFlexItem>
          </EuiFlexGroup>,
          "value": "servicenow-uses-table-api",
        },
      ]
    `);
  });

  test('it disables the dropdown', () => {
    const newWrapper = mount(<ConnectorsDropdown {...props} disabled={true} />, {
      wrappingComponent: TestProviders,
    });

    expect(
      newWrapper.find('[data-test-subj="dropdown-connectors"]').first().prop('disabled')
    ).toEqual(true);
  });

  test('it loading correctly', () => {
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

    expect(
      newWrapper
        .find('[data-test-subj="dropdown-connectors"]')
        .first()
        .text()
        .includes('My Connector, is selected')
    ).toBeTruthy();
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

    const tooltips = screen.getAllByLabelText(
      'This connector is deprecated. Update it, or create a new one.'
    );
    expect(tooltips[0]).toBeInTheDocument();
  });
});
