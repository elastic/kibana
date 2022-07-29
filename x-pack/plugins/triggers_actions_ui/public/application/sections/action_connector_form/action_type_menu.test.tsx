/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';
import { act } from '@testing-library/react';
import { mountWithIntl, nextTick } from '@kbn/test-jest-helpers';
import { coreMock } from '@kbn/core/public/mocks';
import { actionTypeRegistryMock } from '../../action_type_registry.mock';
import { ActionTypeMenu } from './action_type_menu';
import { GenericValidationResult } from '../../../types';
import { useKibana } from '../../../common/lib/kibana';
jest.mock('../../../common/lib/kibana');

jest.mock('../../lib/action_connector_api', () => ({
  ...(jest.requireActual('../../lib/action_connector_api') as any),
  loadActionTypes: jest.fn(),
}));
const { loadActionTypes } = jest.requireMock('../../lib/action_connector_api');

const actionTypeRegistry = actionTypeRegistryMock.create();
const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;

describe('connector_add_flyout', () => {
  beforeAll(async () => {
    const mockes = coreMock.createSetup();
    const [
      {
        application: { capabilities },
      },
    ] = await mockes.getStartServices();
    useKibanaMock().services.application.capabilities = {
      ...capabilities,
      actions: {
        show: true,
        save: true,
        delete: true,
      },
    };
  });
  afterEach(() => {
    actionTypeRegistry.get.mockReset();
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders action type menu with proper EuiCards for registered action types', async () => {
      const onActionTypeChange = jest.fn();
      const actionType = actionTypeRegistryMock.createMockActionTypeModel({
        id: 'my-action-type',
        iconClass: 'test',
        selectMessage: 'test',
        validateParams: (): Promise<GenericValidationResult<unknown>> => {
          const validationResult = { errors: {} };
          return Promise.resolve(validationResult);
        },
        actionConnectorFields: null,
      });
      actionTypeRegistry.get.mockReturnValueOnce(actionType);
      loadActionTypes.mockResolvedValueOnce([
        {
          id: actionType.id,
          enabled: true,
          name: 'Test',
          enabledInConfig: true,
          enabledInLicense: true,
          minimumLicenseRequired: 'basic',
          supportedFeatureIds: ['alerting'],
        },
      ]);

      const wrapper = mountWithIntl(
        <ActionTypeMenu
          onActionTypeChange={onActionTypeChange}
          actionTypeRegistry={actionTypeRegistry}
        />
      );
      await act(async () => {
        await nextTick();
        wrapper.update();
      });

      expect(wrapper.find('[data-test-subj="my-action-type-card"]').exists()).toBeTruthy();
    });

    it(`doesn't renders action types that are disabled via config`, async () => {
      const onActionTypeChange = jest.fn();
      const actionType = actionTypeRegistryMock.createMockActionTypeModel({
        id: 'my-action-type',
        iconClass: 'test',
        selectMessage: 'test',
        validateParams: (): Promise<GenericValidationResult<unknown>> => {
          const validationResult = { errors: {} };
          return Promise.resolve(validationResult);
        },
        actionConnectorFields: null,
      });
      actionTypeRegistry.get.mockReturnValueOnce(actionType);
      loadActionTypes.mockResolvedValueOnce([
        {
          id: actionType.id,
          enabled: false,
          name: 'Test',
          enabledInConfig: false,
          enabledInLicense: true,
          minimumLicenseRequired: 'gold',
          supportedFeatureIds: ['alerting'],
        },
      ]);

      const wrapper = mountWithIntl(
        <ActionTypeMenu
          onActionTypeChange={onActionTypeChange}
          actionTypeRegistry={actionTypeRegistry}
        />
      );
      await act(async () => {
        await nextTick();
        wrapper.update();
      });

      expect(wrapper.find('[data-test-subj="my-action-type-card"]').exists()).toBeFalsy();
    });

    it(`renders action types as disabled when disabled by license`, async () => {
      const onActionTypeChange = jest.fn();
      const actionType = actionTypeRegistryMock.createMockActionTypeModel({
        id: 'my-action-type',
        iconClass: 'test',
        selectMessage: 'test',
        validateParams: (): Promise<GenericValidationResult<unknown>> => {
          const validationResult = { errors: {} };
          return Promise.resolve(validationResult);
        },
        actionConnectorFields: null,
      });
      actionTypeRegistry.get.mockReturnValueOnce(actionType);
      loadActionTypes.mockResolvedValueOnce([
        {
          id: actionType.id,
          enabled: false,
          name: 'Test',
          enabledInConfig: true,
          enabledInLicense: false,
          minimumLicenseRequired: 'gold',
          supportedFeatureIds: ['alerting'],
        },
      ]);

      const wrapper = mountWithIntl(
        <ActionTypeMenu
          onActionTypeChange={onActionTypeChange}
          actionTypeRegistry={actionTypeRegistry}
        />
      );
      await act(async () => {
        await nextTick();
        wrapper.update();
      });

      expect(
        wrapper.find('EuiToolTip [data-test-subj="my-action-type-card"]').exists()
      ).toBeTruthy();
    });
  });

  describe('beta badge', () => {
    it(`does not render beta badge when isExperimental=undefined`, async () => {
      const onActionTypeChange = jest.fn();
      const actionType = actionTypeRegistryMock.createMockActionTypeModel({
        id: 'my-action-type',
        iconClass: 'test',
        selectMessage: 'test',
        validateParams: (): Promise<GenericValidationResult<unknown>> => {
          const validationResult = { errors: {} };
          return Promise.resolve(validationResult);
        },
        actionConnectorFields: null,
      });
      actionTypeRegistry.get.mockReturnValueOnce(actionType);
      loadActionTypes.mockResolvedValueOnce([
        {
          id: actionType.id,
          enabled: false,
          name: 'Test',
          enabledInConfig: true,
          enabledInLicense: false,
          minimumLicenseRequired: 'gold',
          supportedFeatureIds: ['alerting'],
        },
      ]);

      const wrapper = mountWithIntl(
        <ActionTypeMenu
          onActionTypeChange={onActionTypeChange}
          actionTypeRegistry={actionTypeRegistry}
        />
      );
      await act(async () => {
        await nextTick();
        wrapper.update();
      });

      expect(
        wrapper.find('EuiToolTip [data-test-subj="my-action-type-card"] EuiBetaBadge').exists()
      ).toBeFalsy();
    });
    it(`does not render beta badge when isExperimental=false`, async () => {
      const onActionTypeChange = jest.fn();
      const actionType = actionTypeRegistryMock.createMockActionTypeModel({
        id: 'my-action-type',
        iconClass: 'test',
        selectMessage: 'test',
        validateParams: (): Promise<GenericValidationResult<unknown>> => {
          const validationResult = { errors: {} };
          return Promise.resolve(validationResult);
        },
        actionConnectorFields: null,
        isExperimental: false,
      });
      actionTypeRegistry.get.mockReturnValueOnce(actionType);
      loadActionTypes.mockResolvedValueOnce([
        {
          id: actionType.id,
          enabled: false,
          name: 'Test',
          enabledInConfig: true,
          enabledInLicense: false,
          minimumLicenseRequired: 'gold',
          supportedFeatureIds: ['alerting'],
        },
      ]);

      const wrapper = mountWithIntl(
        <ActionTypeMenu
          onActionTypeChange={onActionTypeChange}
          actionTypeRegistry={actionTypeRegistry}
        />
      );
      await act(async () => {
        await nextTick();
        wrapper.update();
      });

      expect(
        wrapper.find('EuiToolTip [data-test-subj="my-action-type-card"] EuiBetaBadge').exists()
      ).toBeFalsy();
    });

    it(`renders beta badge when isExperimental=true`, async () => {
      const onActionTypeChange = jest.fn();
      const actionType = actionTypeRegistryMock.createMockActionTypeModel({
        id: 'my-action-type',
        iconClass: 'test',
        selectMessage: 'test',
        validateParams: (): Promise<GenericValidationResult<unknown>> => {
          const validationResult = { errors: {} };
          return Promise.resolve(validationResult);
        },
        actionConnectorFields: null,
        isExperimental: true,
      });
      actionTypeRegistry.get.mockReturnValueOnce(actionType);
      loadActionTypes.mockResolvedValueOnce([
        {
          id: actionType.id,
          enabled: false,
          name: 'Test',
          enabledInConfig: true,
          enabledInLicense: false,
          minimumLicenseRequired: 'gold',
          supportedFeatureIds: ['alerting'],
        },
      ]);

      const wrapper = mountWithIntl(
        <ActionTypeMenu
          onActionTypeChange={onActionTypeChange}
          actionTypeRegistry={actionTypeRegistry}
        />
      );
      await act(async () => {
        await nextTick();
        wrapper.update();
      });

      expect(
        wrapper.find('EuiToolTip [data-test-subj="my-action-type-card"] EuiBetaBadge').exists()
      ).toBeTruthy();
    });
  });
});
