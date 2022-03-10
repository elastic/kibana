/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Prevent any breaking changes to context requirement from breaking the alert form/actions
 */

import React, { Fragment, lazy } from 'react';
import { mountWithIntl, nextTick } from '@kbn/test-jest-helpers';
import { ReactWrapper, mount } from 'enzyme';
import { act } from 'react-dom/test-utils';
import { coreMock } from 'src/core/public/mocks';
import { actionTypeRegistryMock } from '../../../triggers_actions_ui/public/application/action_type_registry.mock';
import { ruleTypeRegistryMock } from '../../../triggers_actions_ui/public/application/rule_type_registry.mock';
import {
  ValidationResult,
  Rule,
  ConnectorValidationResult,
  GenericValidationResult,
  RuleTypeModel,
} from '../../../triggers_actions_ui/public/types';
import { RuleForm } from '../../../triggers_actions_ui/public/application/sections/rule_form/rule_form';
import ActionForm from '../../../triggers_actions_ui/public/application/sections/action_connector_form/action_form';
import { Legacy } from '../legacy_shims';
import { I18nProvider } from '@kbn/i18n-react';
import { createKibanaReactContext } from '../../../../../src/plugins/kibana_react/public';

interface AlertAction {
  group: string;
  id: string;
  actionTypeId: string;
  params: unknown;
}

jest.mock('../../../triggers_actions_ui/public/application/lib/action_connector_api', () => ({
  loadAllActions: jest.fn(),
  loadActionTypes: jest.fn(),
}));

jest.mock('../../../triggers_actions_ui/public/application/lib/rule_api', () => ({
  loadAlertTypes: jest.fn(),
}));

const initLegacyShims = () => {
  const triggersActionsUi = {
    actionTypeRegistry: actionTypeRegistryMock.create(),
    ruleTypeRegistry: ruleTypeRegistryMock.create(),
  };
  const data = { query: { timefilter: { timefilter: {} } } } as any;
  Legacy.init({
    core: coreMock.createStart(),
    data,
    isCloud: false,
    triggersActionsUi,
    usageCollection: {},
  } as any);
};

const ALERTS_FEATURE_ID = 'alerts';
const validationMethod = (): ValidationResult => ({ errors: {} });
const actionTypeRegistry = actionTypeRegistryMock.create();
const ruleTypeRegistry = ruleTypeRegistryMock.create();

describe('alert_form', () => {
  beforeEach(() => {
    initLegacyShims();
    jest.resetAllMocks();
  });

  const ruleType: RuleTypeModel = {
    id: 'alert-type',
    iconClass: 'test',
    description: 'Testing',
    documentationUrl: 'https://...',
    validate: validationMethod,
    ruleParamsExpression: () => <Fragment />,
    requiresAppContext: false,
  };

  const mockedActionParamsFields = lazy(async () => ({
    default() {
      return <Fragment />;
    },
  }));

  const actionType = {
    id: 'alert-action-type',
    iconClass: '',
    selectMessage: '',
    validateConnector: (): Promise<ConnectorValidationResult<unknown, unknown>> => {
      return Promise.resolve({});
    },
    validateParams: (): Promise<GenericValidationResult<unknown>> => {
      const validationResult = { errors: {} };
      return Promise.resolve(validationResult);
    },
    actionConnectorFields: null,
    actionParamsFields: mockedActionParamsFields,
  };

  describe('alert_form edit alert', () => {
    let wrapper: ReactWrapper<any>;

    beforeEach(async () => {
      ruleTypeRegistry.list.mockReturnValue([ruleType]);
      ruleTypeRegistry.get.mockReturnValue(ruleType);
      ruleTypeRegistry.has.mockReturnValue(true);
      actionTypeRegistry.list.mockReturnValue([actionType]);
      actionTypeRegistry.has.mockReturnValue(true);
      actionTypeRegistry.get.mockReturnValue(actionType);

      const KibanaReactContext = createKibanaReactContext(Legacy.shims.kibanaServices);

      const initialAlert = {
        name: 'test',
        ruleTypeId: ruleType.id,
        params: {},
        consumer: ALERTS_FEATURE_ID,
        schedule: {
          interval: '1m',
        },
        actions: [],
        tags: [],
        muteAll: false,
        enabled: false,
        mutedInstanceIds: [],
      } as unknown as Rule;

      wrapper = mountWithIntl(
        <I18nProvider>
          <KibanaReactContext.Provider>
            <RuleForm
              rule={initialAlert}
              config={{ minimumScheduleInterval: { value: '1m', enforce: false } }}
              dispatch={() => {}}
              errors={{ name: [], 'schedule.interval': [] }}
              operation="create"
              actionTypeRegistry={actionTypeRegistry}
              ruleTypeRegistry={ruleTypeRegistry}
            />
          </KibanaReactContext.Provider>
        </I18nProvider>
      );

      await act(async () => {
        await nextTick();
        wrapper.update();
      });
    });

    it('renders alert name', async () => {
      const alertNameField = wrapper.find('[data-test-subj="ruleNameInput"]');
      expect(alertNameField.exists()).toBeTruthy();
      expect(alertNameField.first().prop('value')).toBe('test');
    });

    it('renders registered selected alert type', async () => {
      const alertTypeSelectOptions = wrapper.find('[data-test-subj="selectedRuleTypeTitle"]');
      expect(alertTypeSelectOptions.exists()).toBeTruthy();
    });

    it('should update throttle value', async () => {
      wrapper.find('button[data-test-subj="notifyWhenSelect"]').simulate('click');
      wrapper.update();
      wrapper.find('button[data-test-subj="onThrottleInterval"]').simulate('click');
      wrapper.update();
      const newThrottle = 17;
      const throttleField = wrapper.find('[data-test-subj="throttleInput"]');
      expect(throttleField.exists()).toBeTruthy();
      throttleField.at(1).simulate('change', { target: { value: newThrottle.toString() } });
      const throttleFieldAfterUpdate = wrapper.find('[data-test-subj="throttleInput"]');
      expect(throttleFieldAfterUpdate.at(1).prop('value')).toEqual(newThrottle);
    });
  });

  describe('alert_form > action_form', () => {
    describe('action_form in alert', () => {
      async function setup() {
        initLegacyShims();
        const { loadAllActions } = jest.requireMock(
          '../../../triggers_actions_ui/public/application/lib/action_connector_api'
        );
        loadAllActions.mockResolvedValueOnce([
          {
            secrets: {},
            id: 'test',
            actionTypeId: actionType.id,
            name: 'Test connector',
            config: {},
            isPreconfigured: false,
          },
        ]);

        actionTypeRegistry.list.mockReturnValue([actionType]);
        actionTypeRegistry.has.mockReturnValue(true);
        actionTypeRegistry.get.mockReturnValue(actionType);

        const initialAlert = {
          name: 'test',
          alertTypeId: ruleType.id,
          params: {},
          consumer: ALERTS_FEATURE_ID,
          schedule: {
            interval: '1m',
          },
          actions: [
            {
              group: 'default',
              id: 'test',
              actionTypeId: actionType.id,
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

        const KibanaReactContext = createKibanaReactContext(Legacy.shims.kibanaServices);

        const actionWrapper = mount(
          <I18nProvider>
            <KibanaReactContext.Provider>
              <ActionForm
                actions={initialAlert.actions}
                defaultActionGroupId={'default'}
                setActionIdByIndex={(id: string, index: number) => {
                  initialAlert.actions[index].id = id;
                }}
                setActions={(_updatedActions: AlertAction[]) => {}}
                setActionParamsProperty={(key: string, value: any, index: number) =>
                  (initialAlert.actions[index] = { ...initialAlert.actions[index], [key]: value })
                }
                actionTypeRegistry={actionTypeRegistry}
                actionTypes={[
                  {
                    id: actionType.id,
                    name: 'Test',
                    enabled: true,
                    enabledInConfig: true,
                    enabledInLicense: true,
                    minimumLicenseRequired: 'basic',
                  },
                ]}
              />
            </KibanaReactContext.Provider>
          </I18nProvider>
        );

        // Wait for active space to resolve before requesting the component to update
        await act(async () => {
          await nextTick();
          actionWrapper.update();
        });

        return actionWrapper;
      }

      it('renders available action cards', async () => {
        const wrapperTwo = await setup();
        const actionOption = wrapperTwo.find(
          `[data-test-subj="${actionType.id}-ActionTypeSelectOption"]`
        );
        expect(actionOption.exists()).toBeTruthy();
      });
    });
  });
});
