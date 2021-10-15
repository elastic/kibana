/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mountWithIntl, nextTick } from '@kbn/test/jest';

import { actionTypeRegistryMock } from '../../action_type_registry.mock';
import {
  ActionConnector,
  ActionType,
  AlertAction,
  ConnectorValidationResult,
  GenericValidationResult,
} from '../../../types';
import { act } from 'react-dom/test-utils';
import { EuiFieldText } from '@elastic/eui';
import { EuiThemeProvider } from '../../../../../../../src/plugins/kibana_react/common';
import AddConnectorInline from './connector_add_inline';
import { useKibana } from '../../../common/lib/kibana';
import { coreMock } from '../../../../../../../src/core/public/mocks';

jest.mock('../../../common/lib/kibana');
const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;
const actionTypeRegistry = actionTypeRegistryMock.create();
const mocks = coreMock.createSetup();

describe('connector_add_inline', () => {
  const mockedActionParamsFields = React.lazy(async () => ({
    default() {
      return (
        <>
          <EuiFieldText
            data-test-subj={'dedupKeyInput'}
            value={'test'}
            onChange={() => true}
            fullWidth
          />
        </>
      );
    },
  }));

  beforeEach(async () => {
    const [
      {
        application: { capabilities },
      },
    ] = await mocks.getStartServices();
    useKibanaMock().services.application.capabilities = {
      ...capabilities,
      actions: {
        delete: true,
        save: true,
        show: true,
      },
    };
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
      actionTypeTitle: 'pagerduty',
    });
    actionTypeRegistry.get.mockReturnValue(actionType);
  });

  describe('deprecated icon', () => {
    const notDeprecatedConnector = {
      actionTypeId: '.pagerduty',
      config: {
        apiUrl: 'http:\\test',
      },
      id: '123',
      isPreconfigured: true,
      name: 'test name',
      secrets: {},
    };

    const actionItem = {
      id: '123',
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

    it('renders the deprecated warning icon for deprecated connectors', async () => {
      const deprecatedConnector = {
        ...notDeprecatedConnector,
        config: { ...notDeprecatedConnector.config, isLegacy: true },
      };

      const wrapper = mountWithIntl(
        createConnectorAddInlineComponent({
          connectors: [deprecatedConnector],
          actionItem,
        })
      );

      // Wait for active space to resolve before requesting the component to update
      await act(async () => {
        await nextTick();
        wrapper.update();
      });

      expect(
        wrapper.find('[data-test-subj="deprecated-connector-icon-123"]').exists()
      ).toBeTruthy();
    });

    it('does not render the deprecated warning icon for non-deprecated connectors', async () => {
      const wrapper = mountWithIntl(
        createConnectorAddInlineComponent({
          connectors: [notDeprecatedConnector],
          actionItem,
        })
      );

      // Wait for active space to resolve before requesting the component to update
      await act(async () => {
        await nextTick();
        wrapper.update();
      });

      expect(wrapper.find('[data-test-subj="deprecated-connector-icon-123"]').exists()).toBeFalsy();
    });
  });
});

function createConnectorAddInlineComponent({
  actionItem,
  connectors,
}: {
  actionItem: AlertAction;
  connectors: ActionConnector[];
}) {
  const actionTypeIndex: Record<string, ActionType> = {
    '.pagerduty': {
      id: '.pagerduty',
      enabled: true,
      name: 'Test',
      enabledInConfig: true,
      enabledInLicense: true,
      minimumLicenseRequired: 'basic',
    },
    '.server-log': {
      id: '.server-log',
      enabled: true,
      name: 'Test SL',
      enabledInConfig: true,
      enabledInLicense: true,
      minimumLicenseRequired: 'basic',
    },
  };

  return (
    <EuiThemeProvider>
      <AddConnectorInline
        actionItem={actionItem}
        actionTypeRegistry={actionTypeRegistry}
        actionTypesIndex={actionTypeIndex}
        connectors={connectors}
        emptyActionsIds={[]}
        index={0}
        onAddConnector={jest.fn()}
        onDeleteConnector={jest.fn()}
        onSelectConnector={jest.fn()}
      />
    </EuiThemeProvider>
  );
}
