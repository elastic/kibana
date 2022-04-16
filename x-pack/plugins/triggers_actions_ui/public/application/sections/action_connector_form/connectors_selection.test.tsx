/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { EuiThemeProvider } from '@kbn/kibana-react-plugin/common';
import { ConnectorsSelection } from './connectors_selection';
import { actionTypeRegistryMock } from '../../action_type_registry.mock';
import { ActionType, ConnectorValidationResult, GenericValidationResult } from '../../../types';
import { EuiFieldText } from '@elastic/eui';

describe('connectors_selection', () => {
  const mockedActionParamsFields = React.lazy(async () => ({
    default() {
      return (
        <>
          <EuiFieldText
            data-test-subj={'fakeInput'}
            value={'test'}
            onChange={() => true}
            fullWidth
          />
        </>
      );
    },
  }));

  const actionItem = {
    id: 'testId',
    actionTypeId: '.pagerduty',
    group: 'recovered',
    params: {
      eventAction: 'recovered',
      dedupKey: undefined,
      summary: '2323',
      source: 'source',
      severity: '1',
      timestamp: new Date().toISOString(),
      component: 'test',
      group: 'group',
      class: 'test class',
    },
  };

  const actionTypeIndex: Record<string, ActionType> = {
    '.pagerduty': {
      id: '.pagerduty',
      enabled: true,
      name: 'Test',
      enabledInConfig: true,
      enabledInLicense: true,
      minimumLicenseRequired: 'basic',
    },
  };

  const connectors = [
    {
      actionTypeId: '.pagerduty',
      config: {
        apiUrl: 'http:\\test',
      },
      id: 'testId',
      isPreconfigured: false,
      name: 'test pagerduty',
      secrets: {},
    },
  ];

  const actionType = actionTypeRegistryMock.createMockActionTypeModel({
    id: '.pagerduty',
    iconClass: 'test',
    selectMessage: 'test',
    validateConnector: (): Promise<ConnectorValidationResult<unknown, unknown>> => {
      return Promise.resolve({});
    },
    validateParams: (): Promise<GenericValidationResult<unknown>> => {
      const validationResult = { errors: {} };
      return Promise.resolve(validationResult);
    },
    actionConnectorFields: null,
    actionParamsFields: mockedActionParamsFields,
  });

  beforeEach(() => {});

  it('renders a selector', () => {
    const wrapper = mountWithIntl(
      <EuiThemeProvider>
        <ConnectorsSelection
          accordionIndex={0}
          actionItem={actionItem}
          actionTypesIndex={actionTypeIndex}
          actionTypeRegistered={actionType}
          connectors={connectors}
          onConnectorSelected={jest.fn()}
        />
      </EuiThemeProvider>
    );

    expect(
      wrapper.find('[data-test-subj="selectActionConnector-.pagerduty-0"]').exists()
    ).toBeTruthy();
  });

  it('renders the title of the connector', () => {
    render(
      <EuiThemeProvider>
        <ConnectorsSelection
          accordionIndex={0}
          actionItem={actionItem}
          actionTypesIndex={actionTypeIndex}
          actionTypeRegistered={actionType}
          connectors={connectors}
          onConnectorSelected={jest.fn()}
        />
      </EuiThemeProvider>
    );

    expect(screen.queryAllByText('test pagerduty')).toHaveLength(1);
  });
});
