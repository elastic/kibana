/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ReactWrapper, ComponentType } from 'enzyme';
import { mount } from 'enzyme';
import { EuiSuperSelect } from '@elastic/eui';
import { render, screen } from '@testing-library/react';

import type { Props } from './connectors_dropdown';
import { ConnectorsDropdown } from './connectors_dropdown';
import { TestProviders } from '../../common/mock';
import { connectors } from './__mock__';

describe('ConnectorsDropdown', () => {
  let wrapper: ReactWrapper;
  const props: Props = {
    disabled: false,
    connectors,
    isLoading: false,
    onChange: jest.fn(),
    selectedConnector: 'none',
  };

  beforeAll(() => {
    wrapper = mount(<ConnectorsDropdown {...props} />, {
      wrappingComponent: TestProviders as ComponentType<React.PropsWithChildren<{}>>,
    });
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
              <EuiIcon
                css={
                  Object {
                    "map": undefined,
                    "name": "atofe7",
                    "next": undefined,
                    "styles": "
                  margin-right: 13px;
                  margin-bottom: 0 !important;
                ",
                    "toString": [Function],
                  }
                }
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
              <EuiIcon
                css={
                  Object {
                    "map": undefined,
                    "name": "13a1e3t",
                    "next": undefined,
                    "styles": "
                            margin-right: 12px;
                            margin-bottom: 0 !important;
                          ",
                    "toString": [Function],
                  }
                }
                size="m"
                type="logoSecurity"
              />
            </EuiFlexItem>
            <EuiFlexItem
              grow={false}
            >
              <span>
                My SN connector
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
              <EuiIcon
                css={
                  Object {
                    "map": undefined,
                    "name": "13a1e3t",
                    "next": undefined,
                    "styles": "
                            margin-right: 12px;
                            margin-bottom: 0 !important;
                          ",
                    "toString": [Function],
                  }
                }
                size="m"
                type="logoSecurity"
              />
            </EuiFlexItem>
            <EuiFlexItem
              grow={false}
            >
              <span>
                My Resilient connector
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
              <EuiIcon
                css={
                  Object {
                    "map": undefined,
                    "name": "13a1e3t",
                    "next": undefined,
                    "styles": "
                            margin-right: 12px;
                            margin-bottom: 0 !important;
                          ",
                    "toString": [Function],
                  }
                }
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
              <EuiIcon
                css={
                  Object {
                    "map": undefined,
                    "name": "13a1e3t",
                    "next": undefined,
                    "styles": "
                            margin-right: 12px;
                            margin-bottom: 0 !important;
                          ",
                    "toString": [Function],
                  }
                }
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
              <EuiIcon
                css={
                  Object {
                    "map": undefined,
                    "name": "13a1e3t",
                    "next": undefined,
                    "styles": "
                            margin-right: 12px;
                            margin-bottom: 0 !important;
                          ",
                    "toString": [Function],
                  }
                }
                size="m"
                type="logoSecurity"
              />
            </EuiFlexItem>
            <EuiFlexItem
              grow={false}
            >
              <span>
                My deprecated SN connector
                 (deprecated)
              </span>
            </EuiFlexItem>
            <EuiFlexItem
              grow={false}
            >
              <EuiIconTip
                aria-label="This connector is deprecated. Update it, or create a new one."
                color="warning"
                content="This connector is deprecated. Update it, or create a new one."
                css={
                  Object {
                    "map": undefined,
                    "name": "pxiz1g",
                    "next": undefined,
                    "styles": "
                              margin-left: 8px
                              margin-bottom: 0 !important;
                            ",
                    "toString": [Function],
                  }
                }
                size="m"
                type="warning"
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
      wrappingComponent: TestProviders as ComponentType<React.PropsWithChildren<{}>>,
    });

    expect(
      newWrapper.find('[data-test-subj="dropdown-connectors"]').first().prop('disabled')
    ).toEqual(true);
  });

  test('it loading correctly', () => {
    const newWrapper = mount(<ConnectorsDropdown {...props} isLoading={true} />, {
      wrappingComponent: TestProviders as ComponentType<React.PropsWithChildren<{}>>,
    });

    expect(
      newWrapper.find('[data-test-subj="dropdown-connectors"]').first().prop('isLoading')
    ).toEqual(true);
  });

  test('it selects the correct connector', () => {
    const newWrapper = mount(<ConnectorsDropdown {...props} selectedConnector={'servicenow-1'} />, {
      wrappingComponent: TestProviders as ComponentType<React.PropsWithChildren<{}>>,
    });

    expect(
      newWrapper
        .find('[data-test-subj="dropdown-connectors"]')
        .first()
        .text()
        .includes('My SN connector')
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
              isDeprecated: false,
              isSystemAction: false,
            },
          ]}
        />,
        {
          wrappingComponent: TestProviders as ComponentType<React.PropsWithChildren<{}>>,
        }
      )
    ).not.toThrowError();
  });

  test('it shows the deprecated tooltip when the connector is deprecated', () => {
    render(<ConnectorsDropdown {...props} selectedConnector="servicenow-uses-table-api" />, {
      wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
    });

    const tooltips = screen.getAllByText(
      'This connector is deprecated. Update it, or create a new one.'
    );
    expect(tooltips[0]).toBeInTheDocument();
  });

  test('it shows the deprecated tooltip when the connector is deprecated by configuration', () => {
    const connector = connectors[0];
    render(
      <ConnectorsDropdown
        {...props}
        connectors={[
          {
            ...connector,
            isDeprecated: true,
          },
        ]}
        selectedConnector={connector.id}
      />,
      { wrapper: ({ children }) => <TestProviders>{children}</TestProviders> }
    );

    const tooltips = screen.getAllByText(
      'This connector is deprecated. Update it, or create a new one.'
    );
    expect(tooltips[0]).toBeInTheDocument();
  });
});
