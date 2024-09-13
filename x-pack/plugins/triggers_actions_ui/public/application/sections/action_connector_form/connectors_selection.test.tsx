/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';
import { coreMock } from '@kbn/core/public/mocks';
import { render, screen } from '@testing-library/react';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { KibanaThemeProvider } from '@kbn/react-kibana-context-theme';
import { ConnectorsSelection } from './connectors_selection';
import { actionTypeRegistryMock } from '../../action_type_registry.mock';
import { ActionType, GenericValidationResult } from '../../../types';
import { EuiFieldText } from '@elastic/eui';

describe('connectors_selection', () => {
  const core = coreMock.createStart();
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
    uuid: '123-456',
  };

  const actionTypeIndex: Record<string, ActionType> = {
    '.pagerduty': {
      id: '.pagerduty',
      enabled: true,
      name: 'Test',
      enabledInConfig: true,
      enabledInLicense: true,
      minimumLicenseRequired: 'basic',
      supportedFeatureIds: ['alerting'],
      isSystemActionType: false,
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
      isDeprecated: false,
      isSystemAction: false as const,
      name: 'test pagerduty',
      secrets: {},
    },
  ];

  const actionType = actionTypeRegistryMock.createMockActionTypeModel({
    id: '.pagerduty',
    iconClass: 'test',
    selectMessage: 'test',
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
      <KibanaThemeProvider theme={core.theme}>
        <ConnectorsSelection
          accordionIndex={0}
          actionItem={actionItem}
          actionTypesIndex={actionTypeIndex}
          actionTypeRegistered={actionType}
          connectors={connectors}
          onConnectorSelected={jest.fn()}
        />
      </KibanaThemeProvider>
    );

    expect(
      wrapper.find('[data-test-subj="selectActionConnector-.pagerduty-0"]').exists()
    ).toBeTruthy();
  });

  it('renders the title of the connector', () => {
    render(
      <KibanaThemeProvider theme={core.theme}>
        <ConnectorsSelection
          accordionIndex={0}
          actionItem={actionItem}
          actionTypesIndex={actionTypeIndex}
          actionTypeRegistered={actionType}
          connectors={connectors}
          onConnectorSelected={jest.fn()}
        />
      </KibanaThemeProvider>
    );

    expect(screen.getByRole('combobox')).toHaveValue('test pagerduty');
  });
});
