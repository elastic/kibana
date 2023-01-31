/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as React from 'react';
import { mountWithIntl, nextTick } from '@kbn/test-jest-helpers';
import { ActionTypeForm } from './action_type_form';
import { actionTypeRegistryMock } from '../../action_type_registry.mock';
import {
  ActionConnector,
  ActionType,
  RuleAction,
  GenericValidationResult,
  ActionConnectorMode,
} from '../../../types';
import { act } from 'react-dom/test-utils';
import { EuiFieldText } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { render, waitFor, screen } from '@testing-library/react';

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

  const mockedActionParamsFieldsWithExecutionMode = React.lazy(async () => ({
    default({ executionMode }: { executionMode?: ActionConnectorMode }) {
      return (
        <>
          {executionMode === ActionConnectorMode.Test && (
            <EuiFieldText data-test-subj="executionModeFieldTest" />
          )}
          {executionMode === ActionConnectorMode.ActionForm && (
            <EuiFieldText data-test-subj="executionModeFieldActionForm" />
          )}
          {executionMode === undefined && (
            <EuiFieldText data-test-subj="executionModeFieldUndefined" />
          )}
        </>
      );
    },
  }));

  it('calls "setActionParamsProperty" to set the default value for the empty dedupKey', async () => {
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
      defaultActionParams: {
        dedupKey: 'test',
        eventAction: 'resolve',
      },
    });
    actionTypeRegistry.get.mockReturnValue(actionType);

    const wrapper = mountWithIntl(
      getActionTypeForm(1, undefined, {
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

  it('renders the actionParamsField with the execution mode set to ActionForm', async () => {
    const actionType = actionTypeRegistryMock.createMockActionTypeModel({
      id: '.pagerduty',
      iconClass: 'test',
      selectMessage: 'test',
      validateParams: (): Promise<GenericValidationResult<unknown>> => {
        const validationResult = { errors: {} };
        return Promise.resolve(validationResult);
      },
      actionConnectorFields: null,
      actionParamsFields: mockedActionParamsFieldsWithExecutionMode,
      defaultActionParams: {
        dedupKey: 'test',
        eventAction: 'resolve',
      },
    });
    actionTypeRegistry.get.mockReturnValue(actionType);

    render(
      <I18nProvider>
        {getActionTypeForm(1, undefined, {
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
        })}
      </I18nProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('executionModeFieldActionForm')).toBeInTheDocument();
      expect(screen.queryByTestId('executionModeFieldTest')).not.toBeInTheDocument();
      expect(screen.queryByTestId('executionModeFieldUndefined')).not.toBeInTheDocument();
    });
  });

  it('does not call "setActionParamsProperty" because dedupKey is not empty', async () => {
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
      defaultActionParams: {
        dedupKey: 'test',
        eventAction: 'resolve',
      },
    });
    actionTypeRegistry.get.mockReturnValue(actionType);

    const wrapper = mountWithIntl(
      getActionTypeForm(1, undefined, {
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

  it('shows an error icon when there is a form error and the action accordion is closed ', async () => {
    const actionType = actionTypeRegistryMock.createMockActionTypeModel({
      id: '.pagerduty',
      iconClass: 'test',
      selectMessage: 'test',
      validateParams: (): Promise<GenericValidationResult<unknown>> => {
        // Add errors to the form
        const validationResult = { errors: { message: ['test error'] } };
        return Promise.resolve(validationResult);
      },
      actionConnectorFields: null,
      actionParamsFields: mockedActionParamsFields,
      defaultActionParams: {
        dedupKey: 'test',
        eventAction: 'resolve',
      },
    });
    actionTypeRegistry.get.mockReturnValue(actionType);

    const wrapper = mountWithIntl(
      getActionTypeForm(1, undefined, {
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
      })
    );

    // Wait for active space to resolve before requesting the component to update
    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    expect(wrapper.exists('[data-test-subj="action-group-error-icon"]')).toBeFalsy();
    wrapper.find('.euiAccordion__button').last().simulate('click');
    // Make sure that the accordion is collapsed
    expect(wrapper.find('.euiAccordion-isOpen').exists()).toBeFalsy();
    expect(wrapper.exists('[data-test-subj="action-group-error-icon"]')).toBeTruthy();

    // Verify that the tooltip renders
    // Use fake timers so we don't have to wait for the EuiToolTip timeout
    jest.useFakeTimers({ legacyFakeTimers: true });
    wrapper.find('[data-test-subj="action-group-error-icon"]').first().simulate('mouseOver');
    // Run the timers so the EuiTooltip will be visible
    jest.runAllTimers();
    wrapper.update();
    expect(wrapper.find('.euiToolTipPopover').last().text()).toBe('Action contains errors.');
    // Clearing all mocks will also reset fake timers.
    jest.clearAllMocks();
  });
});

function getActionTypeForm(
  index?: number,
  actionConnector?: ActionConnector<Record<string, unknown>, Record<string, unknown>>,
  actionItem?: RuleAction,
  defaultActionGroupId?: string,
  connectors?: Array<ActionConnector<Record<string, unknown>, Record<string, unknown>>>,
  actionTypeIndex?: Record<string, ActionType>,
  onAddConnector?: () => void,
  onDeleteAction?: () => void,
  onConnectorSelected?: (id: string) => void
) {
  const actionConnectorDefault = {
    actionTypeId: '.pagerduty',
    config: {
      apiUrl: 'http:\\test',
    },
    id: 'test',
    isPreconfigured: false,
    isDeprecated: false,
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
      isDeprecated: false,
      name: 'test name',
      secrets: {},
    },
    {
      id: '123',
      name: 'Server log',
      actionTypeId: '.server-log',
      isPreconfigured: false,
      isDeprecated: false,
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
      supportedFeatureIds: ['alerting'],
    },
    '.server-log': {
      id: '.server-log',
      enabled: true,
      name: 'Test SL',
      enabledInConfig: true,
      enabledInLicense: true,
      minimumLicenseRequired: 'basic',
      supportedFeatureIds: ['alerting'],
    },
  };

  return (
    <ActionTypeForm
      actionConnector={actionConnector ?? actionConnectorDefault}
      actionItem={actionItem ?? actionItemDefault}
      connectors={connectors ?? connectorsDefault}
      onAddConnector={onAddConnector ?? jest.fn()}
      onDeleteAction={onDeleteAction ?? jest.fn()}
      onConnectorSelected={onConnectorSelected ?? jest.fn()}
      defaultActionGroupId={defaultActionGroupId ?? 'default'}
      setActionParamsProperty={jest.fn()}
      setActionFrequencyProperty={jest.fn()}
      index={index ?? 1}
      actionTypesIndex={actionTypeIndex ?? actionTypeIndexDefault}
      actionTypeRegistry={actionTypeRegistry}
    />
  );
}
