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
import { ConnectorValidationResult, GenericValidationResult } from '../../../types';
import { act } from 'react-dom/test-utils';
jest.mock('../../../common/lib/kibana');
const actionTypeRegistry = actionTypeRegistryMock.create();

describe('action_type_form', () => {
  it('renders action type form with proper elements', async () => {
    const actionType = actionTypeRegistryMock.createMockActionTypeModel({
      id: '.pagerduty',
      iconClass: 'test',
      selectMessage: 'test',
      validateConnector: (): ConnectorValidationResult<unknown, unknown> => {
        return {};
      },
      validateParams: (): GenericValidationResult<unknown> => {
        const validationResult = { errors: {} };
        return validationResult;
      },
      actionConnectorFields: null,
    });
    actionTypeRegistry.get.mockReturnValueOnce(actionType);

    const wrapper = mountWithIntl(
      <ActionTypeForm
        actionConnector={{
          actionTypeId: '.pagerduty',
          config: {},
          id: 'test',
          isPreconfigured: false,
          name: 'test name',
          secrets: {},
        }}
        actionItem={{
          id: '',
          actionTypeId: '.pagerduty',
          group: 'recovered',
          params: {
            eventAction: 'trigger',
            dedupKey: '232323',
            summary: '2323',
            source: 'source',
            severity: '1',
            timestamp: new Date().toISOString(),
            component: 'test',
            group: 'group',
            class: 'test class',
          },
        }}
        connectors={[
          {
            actionTypeId: '.pagerduty',
            config: {},
            id: 'test',
            isPreconfigured: false,
            name: 'test name',
            secrets: {},
          },
        ]}
        onAddConnector={jest.fn()}
        onDeleteAction={jest.fn()}
        onConnectorSelected={jest.fn()}
        actionParamsErrors={{ errors: { summary: [], timestamp: [], dedupKey: [] } }}
        defaultActionGroupId={'default'}
        setActionParamsProperty={jest.fn()}
        index={1}
        actionTypesIndex={{
          '.pagerduty': {
            id: '.pagerduty',
            enabled: true,
            name: 'Test',
            enabledInConfig: true,
            enabledInLicense: true,
            minimumLicenseRequired: 'basic',
          },
        }}
        defaultParams={{
          dedupKey: `test`,
          eventAction: 'resolve',
        }}
        actionTypeRegistry={actionTypeRegistry}
      />
    );

    // Wait for active space to resolve before requesting the component to update
    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    expect(wrapper.find('[data-test-subj="dedupKeyInput"]').first().prop('value')).toStrictEqual(
      '232323'
    );
  });
});
