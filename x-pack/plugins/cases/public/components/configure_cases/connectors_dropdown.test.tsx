/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount, ReactWrapper } from 'enzyme';
import { EuiSuperSelect } from '@elastic/eui';

import { ConnectorsDropdown, Props } from './connectors_dropdown';
import { TestProviders } from '../../common/mock';
import { connectors } from './__mock__';
import { useKibana } from '../../common/lib/kibana';
import { actionTypeRegistryMock } from '../../../../triggers_actions_ui/public/application/action_type_registry.mock';

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

  const { createMockActionTypeModel } = actionTypeRegistryMock;

  beforeAll(() => {
    connectors.forEach((connector) =>
      useKibanaMock().services.triggersActionsUi.actionTypeRegistry.register(
        createMockActionTypeModel({ id: connector.actionTypeId, iconClass: 'logoSecurity' })
      )
    );
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
            gutterSize="none"
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
            <EuiFlexItem>
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
            gutterSize="none"
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
            <EuiFlexItem>
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
            gutterSize="none"
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
            <EuiFlexItem>
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
            gutterSize="none"
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
            <EuiFlexItem>
              <span>
                My Connector SIR
              </span>
            </EuiFlexItem>
          </EuiFlexGroup>,
          "value": "servicenow-sir",
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

  test('if the props hideConnectorServiceNowSir is true, the connector should not be part of the list of options  ', () => {
    const newWrapper = mount(
      <ConnectorsDropdown
        {...props}
        selectedConnector={'servicenow-1'}
        hideConnectorServiceNowSir={true}
      />,
      {
        wrappingComponent: TestProviders,
      }
    );
    const selectProps = newWrapper.find(EuiSuperSelect).props();
    const options = selectProps.options as Array<{ 'data-test-subj': string }>;
    expect(
      options.some((o) => o['data-test-subj'] === 'dropdown-connector-servicenow-1')
    ).toBeTruthy();
    expect(
      options.some((o) => o['data-test-subj'] === 'dropdown-connector-servicenow-sir')
    ).toBeFalsy();
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
});
