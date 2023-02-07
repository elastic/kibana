/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy } from 'react';
import { mountWithIntl, nextTick } from '@kbn/test-jest-helpers';
import { EuiAccordion } from '@elastic/eui';
import { coreMock } from '@kbn/core/public/mocks';
import { act } from 'react-dom/test-utils';
import { actionTypeRegistryMock } from '../../action_type_registry.mock';
import { ValidationResult, Rule, RuleAction, GenericValidationResult } from '../../../types';
import ActionForm from './action_form';
import { useKibana } from '../../../common/lib/kibana';
import {
  RecoveredActionGroup,
  isActionGroupDisabledForActionTypeId,
} from '@kbn/alerting-plugin/common';

jest.mock('../../../common/lib/kibana');
jest.mock('../../lib/action_connector_api', () => ({
  loadAllActions: jest.fn(),
  loadActionTypes: jest.fn(),
}));
const { loadActionTypes } = jest.requireMock('../../lib/action_connector_api');

const setHasActionsWithBrokenConnector = jest.fn();
describe('action_form', () => {
  const mockedActionParamsFields = lazy(async () => ({
    default() {
      return <></>;
    },
  }));

  const alertType = {
    id: 'my-alert-type',
    iconClass: 'test',
    name: 'test-alert',
    validate: (): ValidationResult => {
      return { errors: {} };
    },
    alertParamsExpression: () => <></>,
    requiresAppContext: false,
  };

  const actionType = {
    id: 'my-action-type',
    iconClass: 'test',
    selectMessage: 'test',
    validateParams: (): Promise<GenericValidationResult<unknown>> => {
      const validationResult = { errors: {} };
      return Promise.resolve(validationResult);
    },
    actionConnectorFields: null,
    actionParamsFields: mockedActionParamsFields,
    actionTypeTitle: 'action-type-title',
  };

  const disabledByConfigActionType = {
    id: 'disabled-by-config',
    iconClass: 'test',
    selectMessage: 'test',
    validateParams: (): Promise<GenericValidationResult<unknown>> => {
      const validationResult = { errors: {} };
      return Promise.resolve(validationResult);
    },
    actionConnectorFields: null,
    actionParamsFields: mockedActionParamsFields,
  };

  const disabledByActionType = {
    id: '.jira',
    iconClass: 'test',
    selectMessage: 'test',
    validateParams: (): Promise<GenericValidationResult<unknown>> => {
      const validationResult = { errors: {} };
      return Promise.resolve(validationResult);
    },
    actionConnectorFields: null,
    actionParamsFields: mockedActionParamsFields,
  };

  const disabledByLicenseActionType = {
    id: 'disabled-by-license',
    iconClass: 'test',
    selectMessage: 'test',
    validateParams: (): Promise<GenericValidationResult<unknown>> => {
      const validationResult = { errors: {} };
      return Promise.resolve(validationResult);
    },
    actionConnectorFields: null,
    actionParamsFields: mockedActionParamsFields,
  };

  const preconfiguredOnly = {
    id: 'preconfigured',
    iconClass: 'test',
    selectMessage: 'test',
    validateParams: (): Promise<GenericValidationResult<unknown>> => {
      const validationResult = { errors: {} };
      return Promise.resolve(validationResult);
    },
    actionConnectorFields: null,
    actionParamsFields: mockedActionParamsFields,
  };

  const allActions = [
    {
      secrets: {},
      isMissingSecrets: false,
      id: 'test',
      actionTypeId: actionType.id,
      name: 'Test connector',
      config: {},
      isPreconfigured: false,
      isDeprecated: false,
    },
    {
      secrets: {},
      isMissingSecrets: false,
      id: 'test2',
      actionTypeId: actionType.id,
      name: 'Test connector 2',
      config: {},
      isPreconfigured: true,
      isDeprecated: false,
    },
    {
      secrets: {},
      isMissingSecrets: false,
      id: 'test3',
      actionTypeId: preconfiguredOnly.id,
      name: 'Preconfigured Only',
      config: {},
      isPreconfigured: true,
      isDeprecated: false,
    },
    {
      secrets: {},
      isMissingSecrets: false,
      id: 'test4',
      actionTypeId: preconfiguredOnly.id,
      name: 'Regular connector',
      config: {},
      isPreconfigured: false,
      isDeprecated: false,
    },
    {
      secrets: {},
      isMissingSecrets: false,
      id: '.servicenow',
      actionTypeId: '.servicenow',
      name: 'Non consumer connector',
      config: {},
      isPreconfigured: false,
      isDeprecated: false,
    },
    {
      secrets: {},
      isMissingSecrets: false,
      id: '.jira',
      actionTypeId: disabledByActionType.id,
      name: 'Connector with disabled action group',
      config: {},
      isPreconfigured: false,
      isDeprecated: false,
    },
    {
      secrets: null,
      isMissingSecrets: true,
      id: '.jira',
      actionTypeId: actionType.id,
      name: 'Connector with disabled action group',
      config: {},
      isPreconfigured: false,
      isDeprecated: false,
    },
  ];

  const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;

  async function setup(
    customActions?: RuleAction[],
    customRecoveredActionGroup?: string,
    isExperimental?: boolean
  ) {
    const actionTypeRegistry = actionTypeRegistryMock.create();

    const { loadAllActions } = jest.requireMock('../../lib/action_connector_api');
    loadAllActions.mockResolvedValueOnce(allActions);
    const mocks = coreMock.createSetup();
    const [
      {
        application: { capabilities },
      },
    ] = await mocks.getStartServices();
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useKibanaMock().services.application.capabilities = {
      ...capabilities,
      actions: {
        show: true,
        save: true,
        delete: true,
      },
    };
    const newActionType = {
      ...actionType,
      isExperimental,
    };
    actionTypeRegistry.list.mockReturnValue([
      newActionType,
      disabledByConfigActionType,
      disabledByLicenseActionType,
      disabledByActionType,
      preconfiguredOnly,
    ]);
    actionTypeRegistry.has.mockReturnValue(true);
    actionTypeRegistry.get.mockReturnValue(newActionType);
    const initialAlert = {
      name: 'test',
      params: {},
      consumer: 'alerts',
      alertTypeId: alertType.id,
      schedule: {
        interval: '1m',
      },
      actions: customActions
        ? customActions
        : [
            {
              group: 'default',
              id: 'test',
              actionTypeId: newActionType.id,
              params: {
                message: '',
              },
            },
          ],
      tags: [],
      muteAll: false,
      enabled: false,
      mutedInstanceIds: [],
    } as unknown as Rule;

    loadActionTypes.mockResolvedValue([
      {
        id: newActionType.id,
        name: 'Test',
        enabled: true,
        enabledInConfig: true,
        enabledInLicense: true,
        minimumLicenseRequired: 'basic',
        supportedFeatureIds: ['alerting'],
      },
      {
        id: '.index',
        name: 'Index',
        enabled: true,
        enabledInConfig: true,
        enabledInLicense: true,
        minimumLicenseRequired: 'basic',
        supportedFeatureIds: ['alerting'],
      },
      {
        id: 'preconfigured',
        name: 'Preconfigured only',
        enabled: true,
        enabledInConfig: false,
        enabledInLicense: true,
        minimumLicenseRequired: 'basic',
        supportedFeatureIds: ['alerting'],
      },
      {
        id: 'disabled-by-config',
        name: 'Disabled by config',
        enabled: false,
        enabledInConfig: false,
        enabledInLicense: true,
        minimumLicenseRequired: 'gold',
        supportedFeatureIds: ['alerting'],
      },
      {
        id: 'disabled-by-license',
        name: 'Disabled by license',
        enabled: false,
        enabledInConfig: true,
        enabledInLicense: false,
        minimumLicenseRequired: 'gold',
        supportedFeatureIds: ['alerting'],
      },
      {
        id: '.jira',
        name: 'Disabled by action type',
        enabled: true,
        enabledInConfig: true,
        enabledInLicense: true,
        minimumLicenseRequired: 'basic',
        supportedFeatureIds: ['alerting'],
      },
    ]);

    const defaultActionMessage = 'Alert [{{context.metadata.name}}] has exceeded the threshold';
    const wrapper = mountWithIntl(
      <ActionForm
        actions={initialAlert.actions}
        messageVariables={{
          params: [
            { name: 'testVar1', description: 'test var1' },
            { name: 'testVar2', description: 'test var2' },
          ],
          state: [],
          context: [{ name: 'contextVar', description: 'context var1' }],
        }}
        featureId="alerting"
        defaultActionGroupId={'default'}
        isActionGroupDisabledForActionType={(actionGroupId: string, actionTypeId: string) => {
          const recoveryActionGroupId = customRecoveredActionGroup
            ? customRecoveredActionGroup
            : 'recovered';
          return isActionGroupDisabledForActionTypeId(
            actionGroupId === recoveryActionGroupId ? RecoveredActionGroup.id : actionGroupId,
            actionTypeId
          );
        }}
        setActionIdByIndex={(id: string, index: number) => {
          initialAlert.actions[index].id = id;
        }}
        actionGroups={[
          { id: 'default', name: 'Default', defaultActionMessage },
          {
            id: customRecoveredActionGroup ? customRecoveredActionGroup : 'recovered',
            name: customRecoveredActionGroup ? 'I feel better' : 'Recovered',
          },
        ]}
        setActionGroupIdByIndex={(group: string, index: number) => {
          initialAlert.actions[index].group = group;
        }}
        setActions={(_updatedActions: RuleAction[]) => {}}
        setActionParamsProperty={(key: string, value: any, index: number) =>
          (initialAlert.actions[index] = { ...initialAlert.actions[index], [key]: value })
        }
        setActionFrequencyProperty={(key: string, value: any, index: number) =>
          (initialAlert.actions[index] = {
            ...initialAlert.actions[index],
            frequency: { ...initialAlert.actions[index].frequency!, [key]: value },
          })
        }
        actionTypeRegistry={actionTypeRegistry}
        setHasActionsWithBrokenConnector={setHasActionsWithBrokenConnector}
      />
    );

    // Wait for active space to resolve before requesting the component to update
    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    return wrapper;
  }

  describe('action_form in alert', () => {
    it('renders available action cards', async () => {
      const wrapper = await setup();
      const actionOption = wrapper.find(
        `[data-test-subj="${actionType.id}-alerting-ActionTypeSelectOption"]`
      );
      expect(actionOption.exists()).toBeTruthy();
      expect(
        wrapper
          .find(`EuiToolTip [data-test-subj="${actionType.id}-alerting-ActionTypeSelectOption"]`)
          .exists()
      ).toBeFalsy();
      expect(setHasActionsWithBrokenConnector).toHaveBeenLastCalledWith(false);
      expect(loadActionTypes).toBeCalledWith(
        expect.objectContaining({
          featureId: 'alerting',
        })
      );
    });

    it('does not render action types disabled by config', async () => {
      const wrapper = await setup();
      const actionOption = wrapper.find(
        '[data-test-subj="disabled-by-config-alerting-ActionTypeSelectOption"]'
      );
      expect(actionOption.exists()).toBeFalsy();
    });

    it('render action types which is preconfigured only (disabled by config and with preconfigured connectors)', async () => {
      const wrapper = await setup();
      const actionOption = wrapper.find(
        '[data-test-subj="preconfigured-alerting-ActionTypeSelectOption"]'
      );
      expect(actionOption.exists()).toBeTruthy();
    });

    it('renders available action groups for the selected action type', async () => {
      const wrapper = await setup();
      const actionOption = wrapper.find(
        `[data-test-subj="${actionType.id}-alerting-ActionTypeSelectOption"]`
      );
      actionOption.first().simulate('click');
      const actionGroupsSelect = wrapper.find(
        `[data-test-subj="addNewActionConnectorActionGroup-0"]`
      );
      expect((actionGroupsSelect.first().props() as any).options).toMatchInlineSnapshot(`
        Array [
          Object {
            "data-test-subj": "addNewActionConnectorActionGroup-0-option-default",
            "disabled": false,
            "inputDisplay": "Default",
            "value": "default",
          },
          Object {
            "data-test-subj": "addNewActionConnectorActionGroup-0-option-recovered",
            "disabled": false,
            "inputDisplay": "Recovered",
            "value": "recovered",
          },
        ]
      `);

      await act(async () => {
        await nextTick();
        wrapper.update();
      });
    });

    it('renders disabled action groups for selected action type', async () => {
      const wrapper = await setup([
        {
          group: 'recovered',
          id: 'test',
          actionTypeId: disabledByActionType.id,
          params: {
            message: '',
          },
        },
      ]);
      const actionOption = wrapper.find(`[data-test-subj=".jira-alerting-ActionTypeSelectOption"]`);
      actionOption.first().simulate('click');
      const actionGroupsSelect = wrapper.find(
        `[data-test-subj="addNewActionConnectorActionGroup-1"]`
      );
      expect((actionGroupsSelect.first().props() as any).options).toMatchInlineSnapshot(`
        Array [
          Object {
            "data-test-subj": "addNewActionConnectorActionGroup-1-option-default",
            "disabled": false,
            "inputDisplay": "Default",
            "value": "default",
          },
          Object {
            "data-test-subj": "addNewActionConnectorActionGroup-1-option-recovered",
            "disabled": true,
            "inputDisplay": "Recovered (Not Currently Supported)",
            "value": "recovered",
          },
        ]
      `);
      await act(async () => {
        await nextTick();
        wrapper.update();
      });
    });

    it('renders disabled action groups for custom recovered action groups', async () => {
      const wrapper = await setup(
        [
          {
            group: 'iHaveRecovered',
            id: 'test',
            actionTypeId: disabledByActionType.id,
            params: {
              message: '',
            },
          },
        ],
        'iHaveRecovered'
      );
      const actionOption = wrapper.find(`[data-test-subj=".jira-alerting-ActionTypeSelectOption"]`);
      actionOption.first().simulate('click');
      const actionGroupsSelect = wrapper.find(
        `[data-test-subj="addNewActionConnectorActionGroup-1"]`
      );
      expect((actionGroupsSelect.first().props() as any).options).toMatchInlineSnapshot(`
        Array [
          Object {
            "data-test-subj": "addNewActionConnectorActionGroup-1-option-default",
            "disabled": false,
            "inputDisplay": "Default",
            "value": "default",
          },
          Object {
            "data-test-subj": "addNewActionConnectorActionGroup-1-option-iHaveRecovered",
            "disabled": true,
            "inputDisplay": "I feel better (Not Currently Supported)",
            "value": "iHaveRecovered",
          },
        ]
      `);
      await act(async () => {
        await nextTick();
        wrapper.update();
      });
    });

    it('renders available connectors for the selected action type', async () => {
      const wrapper = await setup();
      const actionOption = wrapper.find(
        `[data-test-subj="${actionType.id}-alerting-ActionTypeSelectOption"]`
      );
      actionOption.first().simulate('click');
      const combobox = wrapper.find(`[data-test-subj="selectActionConnector-${actionType.id}-0"]`);
      const numConnectors = allActions.filter(
        (action) => action.actionTypeId === actionType.id
      ).length;
      const numConnectorsWithMissingSecrets = allActions.filter(
        (action) => action.actionTypeId === actionType.id && action.isMissingSecrets
      ).length;
      expect((combobox.first().props() as any).options.length).toEqual(
        numConnectors - numConnectorsWithMissingSecrets
      );
      expect((combobox.first().props() as any).options).toMatchInlineSnapshot(`
        Array [
          Object {
            "data-test-subj": "dropdown-connector-test",
            "key": "test",
            "label": "Test connector",
            "value": Object {
              "id": "test",
              "prependComponent": undefined,
              "title": "Test connector",
            },
          },
          Object {
            "data-test-subj": "dropdown-connector-test2",
            "key": "test2",
            "label": "Test connector 2",
            "value": Object {
              "id": "test2",
              "prependComponent": undefined,
              "title": "Test connector 2",
            },
          },
        ]
      `);
      await act(async () => {
        await nextTick();
        wrapper.update();
      });
    });

    it('renders only preconfigured connectors for the selected preconfigured action type', async () => {
      const wrapper = await setup();
      const actionOption = wrapper.find(
        '[data-test-subj="preconfigured-alerting-ActionTypeSelectOption"]'
      );
      actionOption.first().simulate('click');
      const combobox = wrapper.find('[data-test-subj="selectActionConnector-preconfigured-1"]');
      expect((combobox.first().props() as any).options).toMatchInlineSnapshot(`
        Array [
          Object {
            "data-test-subj": "dropdown-connector-test3",
            "key": "test3",
            "label": "Preconfigured Only",
            "value": Object {
              "id": "test3",
              "prependComponent": undefined,
              "title": "Preconfigured Only",
            },
          },
        ]
      `);
      await act(async () => {
        await nextTick();
        wrapper.update();
      });
    });

    it('does not render "Add connector" button for preconfigured only action type', async () => {
      const wrapper = await setup();
      const actionOption = wrapper.find(
        '[data-test-subj="preconfigured-alerting-ActionTypeSelectOption"]'
      );
      actionOption.first().simulate('click');
      const preconfigPannel = wrapper.find('[data-test-subj="alertActionAccordion-default"]');
      const addNewConnectorButton = preconfigPannel.find(
        '[data-test-subj="addNewActionConnectorButton-preconfigured"]'
      );
      expect(addNewConnectorButton.exists()).toBeFalsy();
      await act(async () => {
        await nextTick();
        wrapper.update();
      });
    });

    it('renders action types disabled by license', async () => {
      const wrapper = await setup();
      const actionOption = wrapper.find(
        '[data-test-subj="disabled-by-license-alerting-ActionTypeSelectOption"]'
      );
      expect(actionOption.exists()).toBeTruthy();
      expect(
        wrapper
          .find('EuiToolTip [data-test-subj="disabled-by-license-alerting-ActionTypeSelectOption"]')
          .exists()
      ).toBeTruthy();
    });

    it('recognizes actions with broken connectors', async () => {
      const wrapper = await setup([
        {
          group: 'default',
          id: 'test',
          actionTypeId: actionType.id,
          params: {
            message: '',
          },
        },
        {
          group: 'default',
          id: 'connector-doesnt-exist',
          actionTypeId: actionType.id,
          params: {
            message: 'broken',
          },
        },
        {
          group: 'not the default',
          id: 'connector-doesnt-exist',
          actionTypeId: actionType.id,
          params: {
            message: 'broken',
          },
        },
      ]);
      expect(setHasActionsWithBrokenConnector).toHaveBeenLastCalledWith(true);
      expect(wrapper.find(EuiAccordion)).toHaveLength(3);
      expect(
        wrapper.find(`EuiIconTip[data-test-subj="alertActionAccordionErrorTooltip"]`)
      ).toHaveLength(2);
    });
  });

  describe('beta badge (action_type_form)', () => {
    it(`does not render beta badge when isExperimental=undefined`, async () => {
      const wrapper = await setup();
      expect(wrapper.find('EuiKeyPadMenuItem EuiBetaBadge').exists()).toBeFalsy();
      expect(
        wrapper.find('EuiBetaBadge[data-test-subj="action-type-form-beta-badge"]').exists()
      ).toBeFalsy();
    });
    it(`does not render beta badge when isExperimental=false`, async () => {
      const wrapper = await setup(undefined, undefined, false);
      expect(wrapper.find('EuiKeyPadMenuItem EuiBetaBadge').exists()).toBeFalsy();
      expect(
        wrapper.find('EuiBetaBadge[data-test-subj="action-type-form-beta-badge"]').exists()
      ).toBeFalsy();
    });
    it(`renders beta badge when isExperimental=true`, async () => {
      const wrapper = await setup(undefined, undefined, true);
      expect(wrapper.find('EuiKeyPadMenuItem EuiBetaBadge').exists()).toBeTruthy();
      expect(
        wrapper.find('EuiBetaBadge[data-test-subj="action-type-form-beta-badge"]').exists()
      ).toBeTruthy();
    });
  });
});
