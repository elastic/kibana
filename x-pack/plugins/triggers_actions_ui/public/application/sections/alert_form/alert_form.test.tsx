/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment } from 'react';
import { mountWithIntl, nextTick } from '@kbn/test/jest';
import { ReactWrapper } from 'enzyme';
import { act } from 'react-dom/test-utils';
import { actionTypeRegistryMock } from '../../action_type_registry.mock';
import { alertTypeRegistryMock } from '../../alert_type_registry.mock';
import { ValidationResult, Alert } from '../../../types';
import { AlertForm } from './alert_form';
import { coreMock } from 'src/core/public/mocks';
import { ALERTS_FEATURE_ID, RecoveredActionGroup } from '../../../../../alerts/common';
import { useKibana } from '../../../common/lib/kibana';

const actionTypeRegistry = actionTypeRegistryMock.create();
const alertTypeRegistry = alertTypeRegistryMock.create();
jest.mock('../../lib/alert_api', () => ({
  loadAlertTypes: jest.fn(),
}));
jest.mock('../../../common/lib/kibana');

describe('alert_form', () => {
  const alertType = {
    id: 'my-alert-type',
    iconClass: 'test',
    name: 'test-alert',
    description: 'Alert when testing',
    documentationUrl: 'https://localhost.local/docs',
    validate: (): ValidationResult => {
      return { errors: {} };
    },
    alertParamsExpression: () => <Fragment />,
    requiresAppContext: false,
  };

  const actionType = {
    id: 'my-action-type',
    iconClass: 'test',
    selectMessage: 'test',
    validateConnector: (): ValidationResult => {
      return { errors: {} };
    },
    validateParams: (): ValidationResult => {
      const validationResult = { errors: {} };
      return validationResult;
    },
    actionConnectorFields: null,
    actionParamsFields: null,
  };

  const alertTypeNonEditable = {
    id: 'non-edit-alert-type',
    iconClass: 'test',
    name: 'non edit alert',
    description: 'test',
    documentationUrl: null,
    validate: (): ValidationResult => {
      return { errors: {} };
    },
    alertParamsExpression: () => <Fragment />,
    requiresAppContext: true,
  };
  const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;

  describe('alert_form create alert', () => {
    let wrapper: ReactWrapper<any>;

    async function setup() {
      const mocks = coreMock.createSetup();
      const { loadAlertTypes } = jest.requireMock('../../lib/alert_api');
      const alertTypes = [
        {
          id: 'my-alert-type',
          name: 'Test',
          actionGroups: [
            {
              id: 'testActionGroup',
              name: 'Test Action Group',
            },
          ],
          defaultActionGroupId: 'testActionGroup',
          recoveryActionGroup: RecoveredActionGroup,
          producer: ALERTS_FEATURE_ID,
          authorizedConsumers: {
            [ALERTS_FEATURE_ID]: { read: true, all: true },
            test: { read: true, all: true },
          },
        },
      ];
      loadAlertTypes.mockResolvedValue(alertTypes);
      const [
        {
          application: { capabilities },
        },
      ] = await mocks.getStartServices();
      // eslint-disable-next-line react-hooks/rules-of-hooks
      useKibanaMock().services.application.capabilities = {
        ...capabilities,
        alerts: {
          show: true,
          save: true,
          delete: true,
        },
      };
      alertTypeRegistry.list.mockReturnValue([alertType, alertTypeNonEditable]);
      alertTypeRegistry.has.mockReturnValue(true);
      actionTypeRegistry.list.mockReturnValue([actionType]);
      actionTypeRegistry.has.mockReturnValue(true);

      const initialAlert = ({
        name: 'test',
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
      } as unknown) as Alert;

      wrapper = mountWithIntl(
        <AlertForm
          alert={initialAlert}
          dispatch={() => {}}
          errors={{ name: [], interval: [] }}
          operation="create"
          actionTypeRegistry={actionTypeRegistry}
          alertTypeRegistry={alertTypeRegistry}
        />
      );

      await act(async () => {
        await nextTick();
        wrapper.update();
      });
    }

    it('renders alert name', async () => {
      await setup();
      const alertNameField = wrapper.find('[data-test-subj="alertNameInput"]');
      expect(alertNameField.exists()).toBeTruthy();
      expect(alertNameField.first().prop('value')).toBe('test');
    });

    it('renders registered selected alert type', async () => {
      await setup();
      const alertTypeSelectOptions = wrapper.find('[data-test-subj="my-alert-type-SelectOption"]');
      expect(alertTypeSelectOptions.exists()).toBeTruthy();
    });

    it('does not render registered alert type which non editable', async () => {
      await setup();
      const alertTypeSelectOptions = wrapper.find(
        '[data-test-subj="non-edit-alert-type-SelectOption"]'
      );
      expect(alertTypeSelectOptions.exists()).toBeFalsy();
    });

    it('renders registered action types', async () => {
      await setup();
      const alertTypeSelectOptions = wrapper.find(
        '[data-test-subj=".server-log-ActionTypeSelectOption"]'
      );
      expect(alertTypeSelectOptions.exists()).toBeFalsy();
    });

    it('renders alert type description', async () => {
      await setup();
      wrapper.find('button[data-test-subj="my-alert-type-SelectOption"]').first().simulate('click');
      const alertDescription = wrapper.find('[data-test-subj="alertDescription"]');
      expect(alertDescription.exists()).toBeTruthy();
      expect(alertDescription.first().text()).toContain('Alert when testing');
    });

    it('renders alert type documentation link', async () => {
      await setup();
      wrapper.find('button[data-test-subj="my-alert-type-SelectOption"]').first().simulate('click');
      const alertDocumentationLink = wrapper.find('[data-test-subj="alertDocumentationLink"]');
      expect(alertDocumentationLink.exists()).toBeTruthy();
      expect(alertDocumentationLink.first().prop('href')).toBe('https://localhost.local/docs');
    });
  });

  describe('alert_form create alert non alerting consumer and producer', () => {
    let wrapper: ReactWrapper<any>;

    async function setup() {
      const { loadAlertTypes } = jest.requireMock('../../lib/alert_api');

      loadAlertTypes.mockResolvedValue([
        {
          id: 'other-consumer-producer-alert-type',
          name: 'Test',
          actionGroups: [
            {
              id: 'testActionGroup',
              name: 'Test Action Group',
            },
          ],
          defaultActionGroupId: 'testActionGroup',
          recoveryActionGroup: RecoveredActionGroup,
          producer: ALERTS_FEATURE_ID,
          authorizedConsumers: {
            [ALERTS_FEATURE_ID]: { read: true, all: true },
            test: { read: true, all: true },
          },
        },
        {
          id: 'same-consumer-producer-alert-type',
          name: 'Test',
          actionGroups: [
            {
              id: 'testActionGroup',
              name: 'Test Action Group',
            },
          ],
          defaultActionGroupId: 'testActionGroup',
          recoveryActionGroup: RecoveredActionGroup,
          producer: 'test',
          authorizedConsumers: {
            [ALERTS_FEATURE_ID]: { read: true, all: true },
            test: { read: true, all: true },
          },
        },
      ]);
      const mocks = coreMock.createSetup();
      const [
        {
          application: { capabilities },
        },
      ] = await mocks.getStartServices();
      // eslint-disable-next-line react-hooks/rules-of-hooks
      useKibanaMock().services.application.capabilities = {
        ...capabilities,
        alerts: {
          show: true,
          save: true,
          delete: true,
        },
      };
      alertTypeRegistry.list.mockReturnValue([
        {
          id: 'same-consumer-producer-alert-type',
          iconClass: 'test',
          name: 'test-alert',
          description: 'test',
          documentationUrl: null,
          validate: (): ValidationResult => {
            return { errors: {} };
          },
          alertParamsExpression: () => <Fragment />,
          requiresAppContext: true,
        },
        {
          id: 'other-consumer-producer-alert-type',
          iconClass: 'test',
          name: 'test-alert',
          description: 'test',
          documentationUrl: null,
          validate: (): ValidationResult => {
            return { errors: {} };
          },
          alertParamsExpression: () => <Fragment />,
          requiresAppContext: false,
        },
      ]);
      alertTypeRegistry.has.mockReturnValue(true);

      const initialAlert = ({
        name: 'non alerting consumer test',
        params: {},
        consumer: 'test',
        schedule: {
          interval: '1m',
        },
        actions: [],
        tags: [],
        muteAll: false,
        enabled: false,
        mutedInstanceIds: [],
      } as unknown) as Alert;

      wrapper = mountWithIntl(
        <AlertForm
          alert={initialAlert}
          dispatch={() => {}}
          errors={{ name: [], interval: [] }}
          operation="create"
          actionTypeRegistry={actionTypeRegistry}
          alertTypeRegistry={alertTypeRegistry}
        />
      );

      await act(async () => {
        await nextTick();
        wrapper.update();
      });

      expect(loadAlertTypes).toHaveBeenCalled();
    }

    it('renders alert type options which producer correspond to the alert consumer', async () => {
      await setup();
      const alertTypeSelectOptions = wrapper.find(
        '[data-test-subj="same-consumer-producer-alert-type-SelectOption"]'
      );
      expect(alertTypeSelectOptions.exists()).toBeTruthy();
    });

    it('does not render alert type options which producer does not correspond to the alert consumer', async () => {
      await setup();
      const alertTypeSelectOptions = wrapper.find(
        '[data-test-subj="other-consumer-producer-alert-type-SelectOption"]'
      );
      expect(alertTypeSelectOptions.exists()).toBeFalsy();
    });
  });

  describe('alert_form edit alert', () => {
    let wrapper: ReactWrapper<any>;

    async function setup() {
      alertTypeRegistry.list.mockReturnValue([alertType]);
      alertTypeRegistry.get.mockReturnValue(alertType);
      alertTypeRegistry.has.mockReturnValue(true);
      actionTypeRegistry.list.mockReturnValue([actionType]);
      actionTypeRegistry.has.mockReturnValue(true);
      actionTypeRegistry.get.mockReturnValue(actionType);

      const initialAlert = ({
        name: 'test',
        alertTypeId: alertType.id,
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
      } as unknown) as Alert;

      wrapper = mountWithIntl(
        <AlertForm
          alert={initialAlert}
          dispatch={() => {}}
          errors={{ name: [], interval: [] }}
          operation="create"
          actionTypeRegistry={actionTypeRegistry}
          alertTypeRegistry={alertTypeRegistry}
        />
      );

      await act(async () => {
        await nextTick();
        wrapper.update();
      });
    }

    it('renders alert name', async () => {
      await setup();
      const alertNameField = wrapper.find('[data-test-subj="alertNameInput"]');
      expect(alertNameField.exists()).toBeTruthy();
      expect(alertNameField.first().prop('value')).toBe('test');
    });

    it('renders registered selected alert type', async () => {
      await setup();
      const alertTypeSelectOptions = wrapper.find('[data-test-subj="selectedAlertTypeTitle"]');
      expect(alertTypeSelectOptions.exists()).toBeTruthy();
    });

    it('should update throttle value', async () => {
      const newThrottle = 17;
      await setup();
      const throttleField = wrapper.find('[data-test-subj="throttleInput"]');
      expect(throttleField.exists()).toBeTruthy();
      throttleField.at(1).simulate('change', { target: { value: newThrottle.toString() } });
      const throttleFieldAfterUpdate = wrapper.find('[data-test-subj="throttleInput"]');
      expect(throttleFieldAfterUpdate.at(1).prop('value')).toEqual(newThrottle);
    });

    it('should unset throttle value', async () => {
      const newThrottle = '';
      await setup();
      const throttleField = wrapper.find('[data-test-subj="throttleInput"]');
      expect(throttleField.exists()).toBeTruthy();
      throttleField.at(1).simulate('change', { target: { value: newThrottle } });
      const throttleFieldAfterUpdate = wrapper.find('[data-test-subj="throttleInput"]');
      expect(throttleFieldAfterUpdate.at(1).prop('value')).toEqual(newThrottle);
    });

    it('renders alert type description', async () => {
      await setup();
      const alertDescription = wrapper.find('[data-test-subj="alertDescription"]');
      expect(alertDescription.exists()).toBeTruthy();
      expect(alertDescription.first().text()).toContain('Alert when testing');
    });

    it('renders alert type documentation link', async () => {
      await setup();
      const alertDocumentationLink = wrapper.find('[data-test-subj="alertDocumentationLink"]');
      expect(alertDocumentationLink.exists()).toBeTruthy();
      expect(alertDocumentationLink.first().prop('href')).toBe('https://localhost.local/docs');
    });
  });
});
