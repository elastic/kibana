/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { SystemActionTypeForm } from './system_action_type_form';
import { actionTypeRegistryMock } from '../../action_type_registry.mock';
import { ActionType, GenericValidationResult, ActionParamsProps } from '../../../types';
import { EuiButton } from '@elastic/eui';
import { AlertConsumers } from '@kbn/rule-data-utils';
import { I18nProvider } from '@kbn/i18n-react';
import userEvent from '@testing-library/user-event';

const actionTypeRegistry = actionTypeRegistryMock.create();

jest.mock('../../../common/lib/kibana');

jest.mock('@kbn/alerts-ui-shared/src/action_variables/transforms', () => {
  const original = jest.requireActual('@kbn/alerts-ui-shared/src/action_variables/transforms');
  return {
    ...original,
    transformActionVariables: jest.fn(),
  };
});

jest.mock('../../hooks/use_rule_aad_template_fields', () => ({
  useRuleTypeAadTemplateFields: () => ({
    isLoading: false,
    fields: [],
  }),
}));

const actionConnector = {
  actionTypeId: '.test-system-action',
  config: {},
  id: 'test',
  isPreconfigured: false as const,
  isDeprecated: false,
  isSystemAction: true,
  name: 'test name',
  secrets: {},
};

const actionItem = {
  id: '123',
  actionTypeId: '.test-system-action',
  params: {},
};

const connectors = [actionConnector];

const actionTypeIndexDefault: Record<string, ActionType> = {
  '.test-system-action': {
    id: '.test-system-action',
    enabled: true,
    name: 'Test',
    enabledInConfig: true,
    enabledInLicense: true,
    minimumLicenseRequired: 'basic',
    supportedFeatureIds: ['alerting'],
    isSystemActionType: true,
  },
};

const mockedActionParamsFields = React.lazy(async () => ({
  default(props: ActionParamsProps<{}>) {
    return (
      <>
        <EuiButton
          data-test-subj={'test-button'}
          onClick={() => {
            props.editAction('my-key', 'my-value', 1);
          }}
        />
      </>
    );
  },
}));

describe('action_type_form', () => {
  beforeEach(() => {
    const actionType = actionTypeRegistryMock.createMockActionTypeModel({
      id: '.test-system-action',
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
      isSystemActionType: true,
    });

    actionTypeRegistry.get.mockReturnValue(actionType);

    jest.clearAllMocks();
  });

  it('should render the system action correctly', async () => {
    render(
      <I18nProvider>
        <SystemActionTypeForm
          actionConnector={actionConnector}
          actionItem={actionItem}
          connectors={connectors}
          onDeleteAction={jest.fn()}
          setActionParamsProperty={jest.fn()}
          index={1}
          actionTypesIndex={actionTypeIndexDefault}
          actionTypeRegistry={actionTypeRegistry}
          messageVariables={{ context: [], state: [], params: [] }}
          summaryMessageVariables={{ context: [], state: [], params: [] }}
          producerId={AlertConsumers.INFRASTRUCTURE}
          featureId={AlertConsumers.INFRASTRUCTURE}
          ruleTypeId={'test'}
        />
      </I18nProvider>
    );

    expect(await screen.findByTestId('test-button')).toBeInTheDocument();
  });

  it('should render the name of the system action correctly', async () => {
    render(
      <I18nProvider>
        <SystemActionTypeForm
          actionConnector={actionConnector}
          actionItem={actionItem}
          connectors={connectors}
          onDeleteAction={jest.fn()}
          setActionParamsProperty={jest.fn()}
          index={1}
          actionTypesIndex={actionTypeIndexDefault}
          actionTypeRegistry={actionTypeRegistry}
          messageVariables={{ context: [], state: [], params: [] }}
          summaryMessageVariables={{ context: [], state: [], params: [] }}
          producerId={AlertConsumers.INFRASTRUCTURE}
          featureId={AlertConsumers.INFRASTRUCTURE}
          ruleTypeId={'test'}
        />
      </I18nProvider>
    );

    expect(await screen.findByText('test name')).toBeInTheDocument();
  });

  it('calls onDeleteAction correctly', async () => {
    const onDelete = jest.fn();

    render(
      <I18nProvider>
        <SystemActionTypeForm
          actionConnector={actionConnector}
          actionItem={actionItem}
          connectors={connectors}
          onDeleteAction={onDelete}
          setActionParamsProperty={jest.fn()}
          index={1}
          actionTypesIndex={actionTypeIndexDefault}
          actionTypeRegistry={actionTypeRegistry}
          messageVariables={{ context: [], state: [], params: [] }}
          summaryMessageVariables={{ context: [], state: [], params: [] }}
          producerId={AlertConsumers.INFRASTRUCTURE}
          featureId={AlertConsumers.INFRASTRUCTURE}
          ruleTypeId={'test'}
        />
      </I18nProvider>
    );

    userEvent.click(await screen.findByTestId('system-action-delete-button'));

    await waitFor(() => {
      expect(onDelete).toHaveBeenCalled();
    });
  });

  it('calls setActionParamsProperty correctly', async () => {
    const setActionParamsProperty = jest.fn();

    render(
      <I18nProvider>
        <SystemActionTypeForm
          actionConnector={actionConnector}
          actionItem={actionItem}
          connectors={connectors}
          onDeleteAction={jest.fn()}
          setActionParamsProperty={setActionParamsProperty}
          index={1}
          actionTypesIndex={actionTypeIndexDefault}
          actionTypeRegistry={actionTypeRegistry}
          messageVariables={{ context: [], state: [], params: [] }}
          summaryMessageVariables={{ context: [], state: [], params: [] }}
          producerId={AlertConsumers.INFRASTRUCTURE}
          featureId={AlertConsumers.INFRASTRUCTURE}
          ruleTypeId={'test'}
        />
      </I18nProvider>
    );

    userEvent.click(await screen.findByTestId('test-button'));

    expect(setActionParamsProperty).toHaveBeenCalledWith('my-key', 'my-value', 1);
  });
});
