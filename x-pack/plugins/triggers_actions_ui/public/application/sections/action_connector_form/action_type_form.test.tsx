/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as React from 'react';
import { mountWithIntl, nextTick } from '@kbn/test/jest';

import { ActionTypeForm } from './action_type_form';
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
import { DefaultActionParams } from '../../lib/get_defaults_for_action_params';

jest.mock('../../../common/lib/kibana');
const actionTypeRegistry = actionTypeRegistryMock.create();

describe('action_type_form', () => {
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

  beforeEach(() => {
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
    actionTypeRegistry.get.mockReturnValue(actionType);
  });

  describe('deprecated icon', () => {
    const notDeprecatedConnector = {
      actionTypeId: '.pagerduty',
      config: {
        apiUrl: 'http:\\test',
      },
      id: 'test',
      isPreconfigured: false,
      name: 'test name',
      secrets: {},
    };

    const actionItem = {
      id: 'test',
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
        getActionTypeForm({
          actionConnector: deprecatedConnector,
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
        wrapper.find('[data-test-subj="deprecated-connector-icon-test"]').exists()
      ).toBeTruthy();
    });

    it('does not render the deprecated warning icon for non-deprecated connectors', async () => {
      const wrapper = mountWithIntl(
        getActionTypeForm({
          actionConnector: notDeprecatedConnector,
          connectors: [notDeprecatedConnector],
          actionItem,
        })
      );

      // Wait for active space to resolve before requesting the component to update
      await act(async () => {
        await nextTick();
        wrapper.update();
      });

      expect(
        wrapper.find('[data-test-subj="deprecated-connector-icon-test"]').exists()
      ).toBeFalsy();
    });
  });

  it('calls "setActionParamsProperty" to set the default value for the empty dedupKey', async () => {
    const wrapper = mountWithIntl(
      getActionTypeForm({
        actionItem: {
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
        },
      })
    );

    // Wait for active space to resolve before requesting the component to update
    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    expect(wrapper.find('ActionTypeForm').first().prop('setActionParamsProperty')).toBeCalledWith(
      'dedupKey',
      'test',
      1
    );
  });

  it('does not call "setActionParamsProperty" because dedupKey is not empty', async () => {
    const wrapper = mountWithIntl(
      getActionTypeForm({
        index: 1,
        actionItem: {
          id: '123',
          actionTypeId: '.pagerduty',
          group: 'recovered',
          params: {
            eventAction: 'recovered',
            dedupKey: '232323',
            summary: '2323',
            source: 'source',
            severity: '1',
            timestamp: new Date().toISOString(),
            component: 'test',
            group: 'group',
            class: 'test class',
          },
        },
      })
    );

    // Wait for active space to resolve before requesting the component to update
    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    expect(wrapper.find('ActionTypeForm').first().prop('setActionParamsProperty')).toBeCalledTimes(
      0
    );
  });
});

function getActionTypeForm({
  index,
  actionConnector,
  actionItem,
  defaultActionGroupId,
  connectors,
  actionTypeIndex,
  defaultParams,
  onAddConnector,
  onDeleteAction,
  onConnectorSelected,
}: {
  index?: number;
  actionConnector?: ActionConnector<Record<string, unknown>, Record<string, unknown>>;
  actionItem?: AlertAction;
  defaultActionGroupId?: string;
  connectors?: Array<ActionConnector<Record<string, unknown>, Record<string, unknown>>>;
  actionTypeIndex?: Record<string, ActionType>;
  defaultParams?: DefaultActionParams;
  onAddConnector?: () => void;
  onDeleteAction?: () => void;
  onConnectorSelected?: (id: string) => void;
}) {
  const actionConnectorDefault = {
    actionTypeId: '.pagerduty',
    config: {
      apiUrl: 'http:\\test',
    },
    id: 'test',
    isPreconfigured: false,
    name: 'test name',
    secrets: {},
  };

  const actionItemDefault = {
    id: '123',
    actionTypeId: '.pagerduty',
    group: 'trigger',
    params: {
      eventAction: 'trigger',
      summary: '2323',
    },
  };

  const connectorsDefault = [
    {
      actionTypeId: '.pagerduty',
      config: {
        apiUrl: 'http:\\test',
      },
      id: 'test',
      isPreconfigured: false,
      name: 'test name',
      secrets: {},
    },
    {
      id: '123',
      name: 'Server log',
      actionTypeId: '.server-log',
      isPreconfigured: false,
      config: {},
      secrets: {},
    },
  ];

  const actionTypeIndexDefault: Record<string, ActionType> = {
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

  const defaultParamsDefault = {
    dedupKey: `test`,
    eventAction: 'resolve',
  };
  return (
    <EuiThemeProvider>
      <ActionTypeForm
        actionConnector={actionConnector ?? actionConnectorDefault}
        actionItem={actionItem ?? actionItemDefault}
        connectors={connectors ?? connectorsDefault}
        onAddConnector={onAddConnector ?? jest.fn()}
        onDeleteAction={onDeleteAction ?? jest.fn()}
        onConnectorSelected={onConnectorSelected ?? jest.fn()}
        defaultActionGroupId={defaultActionGroupId ?? 'default'}
        setActionParamsProperty={jest.fn()}
        index={index ?? 1}
        actionTypesIndex={actionTypeIndex ?? actionTypeIndexDefault}
        defaultParams={defaultParams ?? defaultParamsDefault}
        actionTypeRegistry={actionTypeRegistry}
      />
    </EuiThemeProvider>
  );
}
