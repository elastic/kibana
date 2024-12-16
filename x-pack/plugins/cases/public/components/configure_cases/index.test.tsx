/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ComponentType, ReactWrapper } from 'enzyme';
import { mount } from 'enzyme';
import { waitFor, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ConfigureCases } from '.';
import { noCasesSettingsPermission, TestProviders, createAppMockRenderer } from '../../common/mock';
import { customFieldsConfigurationMock, templatesConfigurationMock } from '../../containers/mock';
import type { AppMockRenderer } from '../../common/mock';
import { Connectors } from './connectors';
import { ClosureOptions } from './closure_options';

import { useKibana } from '../../common/lib/kibana';
import { useGetCaseConfiguration } from '../../containers/configure/use_get_case_configuration';
import { usePersistConfiguration } from '../../containers/configure/use_persist_configuration';

import {
  connectors,
  searchURL,
  useCaseConfigureResponse,
  useConnectorsResponse,
  useActionTypesResponse,
  usePersistConfigurationMockResponse,
} from './__mock__';
import type { CustomFieldsConfiguration } from '../../../common/types/domain';
import { ConnectorTypes, CustomFieldTypes } from '../../../common/types/domain';
import { actionTypeRegistryMock } from '@kbn/triggers-actions-ui-plugin/public/application/action_type_registry.mock';
import { useGetActionTypes } from '../../containers/configure/use_action_types';
import { useGetSupportedActionConnectors } from '../../containers/configure/use_get_supported_action_connectors';
import { useLicense } from '../../common/use_license';
import * as i18n from './translations';

jest.mock('../../common/lib/kibana');
jest.mock('../../containers/configure/use_get_supported_action_connectors');
jest.mock('../../containers/configure/use_get_case_configuration');
jest.mock('../../containers/configure/use_persist_configuration');
jest.mock('../../containers/configure/use_action_types');
jest.mock('../../common/use_license');

const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;
const useGetConnectorsMock = useGetSupportedActionConnectors as jest.Mock;
const useGetCaseConfigurationMock = useGetCaseConfiguration as jest.Mock;
const usePersistConfigurationMock = usePersistConfiguration as jest.Mock;
const useGetUrlSearchMock = jest.fn();
const useGetActionTypesMock = useGetActionTypes as jest.Mock;
const getAddConnectorFlyoutMock = jest.fn();
const getEditConnectorFlyoutMock = jest.fn();
const useLicenseMock = useLicense as jest.Mock;

describe('ConfigureCases', () => {
  beforeAll(() => {
    useKibanaMock().services.triggersActionsUi.actionTypeRegistry.get = jest.fn().mockReturnValue({
      actionTypeTitle: '.servicenow',
      iconClass: 'logoSecurity',
    });

    useKibanaMock().services.triggersActionsUi.getAddConnectorFlyout =
      getAddConnectorFlyoutMock.mockReturnValue(<div data-test-subj="add-connector-flyout" />);

    useKibanaMock().services.triggersActionsUi.getEditConnectorFlyout =
      getEditConnectorFlyoutMock.mockReturnValue(<div data-test-subj="edit-connector-flyout" />);
  });

  beforeEach(() => {
    useGetActionTypesMock.mockImplementation(() => useActionTypesResponse);
    useLicenseMock.mockReturnValue({ isAtLeastGold: () => true });
  });

  describe('rendering', () => {
    let wrapper: ReactWrapper;
    beforeEach(() => {
      useGetCaseConfigurationMock.mockImplementation(() => useCaseConfigureResponse);
      usePersistConfigurationMock.mockImplementation(() => usePersistConfigurationMockResponse);
      useGetConnectorsMock.mockImplementation(() => ({
        ...useConnectorsResponse,
        data: [],
        isLoading: false,
      }));
      useGetUrlSearchMock.mockImplementation(() => searchURL);

      wrapper = mount(<ConfigureCases />, {
        wrappingComponent: TestProviders as ComponentType<React.PropsWithChildren<{}>>,
      });
    });

    test('it renders the Connectors', () => {
      expect(wrapper.find('[data-test-subj="dropdown-connectors"]').exists()).toBeTruthy();
    });

    test('it renders the ClosureType', () => {
      expect(wrapper.find('[data-test-subj="closure-options-radio-group"]').exists()).toBeTruthy();
    });

    test('it does NOT render the add connector flyout', () => {
      expect(wrapper.find('[data-test-subj="add-connector-flyout"]').exists()).toBeFalsy();
    });

    test('it does NOT render the edit connector flyout"]', () => {
      expect(wrapper.find('[data-test-subj="edit-connector-flyout"]').exists()).toBeFalsy();
    });

    test('it does NOT render the EuiCallOut', () => {
      expect(
        wrapper.find('[data-test-subj="configure-cases-warning-callout"]').exists()
      ).toBeFalsy();
    });
  });

  describe('Unhappy path', () => {
    let wrapper: ReactWrapper;

    beforeEach(() => {
      useGetCaseConfigurationMock.mockImplementation(() => ({
        data: {
          ...useCaseConfigureResponse.data,
          closureType: 'close-by-user',
          connector: {
            id: 'not-id',
            name: 'unchanged',
            type: ConnectorTypes.none,
            fields: null,
          },
        },
      }));

      useGetConnectorsMock.mockImplementation(() => ({
        ...useConnectorsResponse,
        data: [],
        isLoading: false,
      }));
      useGetUrlSearchMock.mockImplementation(() => searchURL);
      wrapper = mount(<ConfigureCases />, {
        wrappingComponent: TestProviders as ComponentType<React.PropsWithChildren<{}>>,
      });
    });

    test('it shows the warning callout when configuration is invalid', () => {
      expect(
        wrapper.find('[data-test-subj="configure-cases-warning-callout"]').exists()
      ).toBeTruthy();
    });

    test('it hides the update connector button when the connectorId is invalid', () => {
      expect(
        wrapper
          .find('button[data-test-subj="case-configure-update-selected-connector-button"]')
          .exists()
      ).toBeFalsy();
    });
  });

  describe('Happy path', () => {
    let wrapper: ReactWrapper;

    beforeEach(() => {
      useGetCaseConfigurationMock.mockImplementation(() => ({
        ...useCaseConfigureResponse,
        data: {
          ...useCaseConfigureResponse.data,
          mappings: [],
          closureType: 'close-by-user',
          connector: {
            id: 'servicenow-1',
            name: 'unchanged',
            type: ConnectorTypes.serviceNowITSM,
            fields: null,
          },
        },
      }));

      useGetConnectorsMock.mockImplementation(() => useConnectorsResponse);
      useGetUrlSearchMock.mockImplementation(() => searchURL);

      wrapper = mount(<ConfigureCases />, {
        wrappingComponent: TestProviders as ComponentType<React.PropsWithChildren<{}>>,
      });
    });

    test('it renders with correct props', () => {
      // Connector
      expect(wrapper.find(Connectors).prop('connectors')).toEqual(connectors);
      expect(wrapper.find(Connectors).prop('disabled')).toBe(false);
      expect(wrapper.find(Connectors).prop('isLoading')).toBe(false);
      expect(wrapper.find(Connectors).prop('selectedConnector').id).toBe('servicenow-1');

      // ClosureOptions
      expect(wrapper.find(ClosureOptions).prop('disabled')).toBe(false);
      expect(wrapper.find(ClosureOptions).prop('closureTypeSelected')).toBe('close-by-user');

      // Flyouts
      expect(wrapper.find('[data-test-subj="add-connector-flyout"]').exists()).toBe(false);
      expect(wrapper.find('[data-test-subj="edit-connector-flyout"]').exists()).toBe(false);
    });

    test('it disables correctly when the user does not have settings privilege', () => {
      const newWrapper = mount(<ConfigureCases />, {
        wrappingComponent: TestProviders as ComponentType<React.PropsWithChildren<{}>>,
        wrappingComponentProps: { permissions: noCasesSettingsPermission() },
      });

      expect(newWrapper.find('button[data-test-subj="dropdown-connectors"]').prop('disabled')).toBe(
        true
      );

      expect(
        newWrapper
          .find('button[data-test-subj="case-configure-update-selected-connector-button"]')
          .prop('disabled')
      ).toBe(true);

      // Two closure options
      expect(
        newWrapper
          .find('[data-test-subj="closure-options-radio-group"] input')
          .first()
          .prop('disabled')
      ).toBe(true);

      expect(
        newWrapper
          .find('[data-test-subj="closure-options-radio-group"] input')
          .at(1)
          .prop('disabled')
      ).toBe(true);
    });
  });

  describe('loading connectors', () => {
    let wrapper: ReactWrapper;

    beforeEach(() => {
      useGetCaseConfigurationMock.mockImplementation(() => ({
        ...useCaseConfigureResponse,
        data: {
          ...useCaseConfigureResponse.data,
          mapping: null,
          closureType: 'close-by-user',
          connector: {
            id: 'resilient-2',
            name: 'unchanged',
            type: ConnectorTypes.resilient,
            fields: null,
          },
        },
      }));

      useGetConnectorsMock.mockImplementation(() => ({
        ...useConnectorsResponse,
        isLoading: true,
      }));

      useGetUrlSearchMock.mockImplementation(() => searchURL);
      wrapper = mount(<ConfigureCases />, {
        wrappingComponent: TestProviders as ComponentType<React.PropsWithChildren<{}>>,
      });
    });

    test('it disables correctly Connector when loading connectors', () => {
      expect(
        wrapper.find('button[data-test-subj="dropdown-connectors"]').prop('disabled')
      ).toBeTruthy();
    });

    test('it pass the correct value to isLoading attribute on Connector', () => {
      expect(wrapper.find(Connectors).prop('isLoading')).toBe(true);
    });

    test('it disables correctly ClosureOptions when loading connectors', () => {
      expect(wrapper.find(ClosureOptions).prop('disabled')).toBe(true);
    });

    test('it hides the update connector button when loading the connectors', () => {
      expect(
        wrapper
          .find('button[data-test-subj="case-configure-update-selected-connector-button"]')
          .prop('disabled')
      ).toBe(true);
    });

    test('it shows isLoading when loading action types', () => {
      useGetConnectorsMock.mockImplementation(() => ({
        ...useConnectorsResponse,
        isLoading: false,
      }));

      useGetActionTypesMock.mockImplementation(() => ({
        ...useActionTypesResponse,
        isLoading: true,
      }));

      wrapper = mount(<ConfigureCases />, {
        wrappingComponent: TestProviders as ComponentType<React.PropsWithChildren<{}>>,
      });
      expect(wrapper.find(Connectors).prop('isLoading')).toBe(true);
    });
  });

  describe('saving configuration', () => {
    let wrapper: ReactWrapper;

    beforeEach(() => {
      useGetCaseConfigurationMock.mockImplementation(() => ({
        ...useCaseConfigureResponse,
        data: {
          ...useCaseConfigureResponse.data,
          connector: {
            id: 'servicenow-1',
            name: 'SN',
            type: ConnectorTypes.serviceNowITSM,
            fields: null,
          },
        },
      }));

      usePersistConfigurationMock.mockImplementation(() => ({
        ...usePersistConfigurationMockResponse,
        isLoading: true,
      }));

      useGetConnectorsMock.mockImplementation(() => useConnectorsResponse);
      useGetUrlSearchMock.mockImplementation(() => searchURL);
      wrapper = mount(<ConfigureCases />, {
        wrappingComponent: TestProviders as ComponentType<React.PropsWithChildren<{}>>,
      });
    });

    test('it disables correctly Connector when saving configuration', () => {
      expect(wrapper.find(Connectors).prop('disabled')).toBe(true);
    });

    test('it disables correctly ClosureOptions when saving configuration', () => {
      expect(
        wrapper
          .find('[data-test-subj="closure-options-radio-group"] input')
          .first()
          .prop('disabled')
      ).toBe(true);

      expect(
        wrapper.find('[data-test-subj="closure-options-radio-group"] input').at(1).prop('disabled')
      ).toBe(true);
    });

    test('it disables the update connector button when saving the configuration', () => {
      expect(
        wrapper
          .find('button[data-test-subj="case-configure-update-selected-connector-button"]')
          .prop('disabled')
      ).toBe(true);
    });
  });

  describe('loading configuration', () => {
    let wrapper: ReactWrapper;

    beforeEach(() => {
      useGetCaseConfigurationMock.mockImplementation(() => ({
        ...useCaseConfigureResponse,
        isLoading: true,
      }));

      useGetConnectorsMock.mockImplementation(() => ({
        ...useConnectorsResponse,
      }));

      useGetUrlSearchMock.mockImplementation(() => searchURL);
      wrapper = mount(<ConfigureCases />, {
        wrappingComponent: TestProviders as ComponentType<React.PropsWithChildren<{}>>,
      });
    });

    test('it hides the update connector button when loading the configuration', () => {
      expect(
        wrapper
          .find('button[data-test-subj="case-configure-update-selected-connector-button"]')
          .exists()
      ).toBeFalsy();
    });
  });

  describe('connectors', () => {
    const persistCaseConfigure = jest.fn();
    let wrapper: ReactWrapper;

    beforeEach(() => {
      useGetCaseConfigurationMock.mockImplementation(() => ({
        data: {
          ...useCaseConfigureResponse.data,
          mapping: null,
          closureType: 'close-by-user',
          connector: {
            id: 'resilient-2',
            name: 'My connector',
            type: ConnectorTypes.resilient,
            fields: null,
          },
        },
      }));

      usePersistConfigurationMock.mockImplementation(() => ({
        ...usePersistConfigurationMockResponse,
        mutate: persistCaseConfigure,
      }));

      useGetConnectorsMock.mockImplementation(() => useConnectorsResponse);
      useGetUrlSearchMock.mockImplementation(() => searchURL);

      wrapper = mount(<ConfigureCases />, {
        wrappingComponent: TestProviders as ComponentType<React.PropsWithChildren<{}>>,
      });
    });

    test('it submits the configuration correctly when changing connector', () => {
      wrapper.find('button[data-test-subj="dropdown-connectors"]').simulate('click');
      wrapper.update();
      wrapper.find('button[data-test-subj="dropdown-connector-resilient-2"]').simulate('click');
      wrapper.update();

      expect(persistCaseConfigure).toHaveBeenCalled();
      expect(persistCaseConfigure).toHaveBeenCalledWith({
        connector: {
          id: 'resilient-2',
          name: 'My Resilient connector',
          type: ConnectorTypes.resilient,
          fields: null,
        },
        closureType: 'close-by-user',
        customFields: [],
        templates: [],
        id: '',
        version: '',
      });
    });

    test('the text of the update button is changed successfully', () => {
      useGetCaseConfigurationMock
        .mockImplementationOnce(() => ({
          ...useCaseConfigureResponse,
          data: {
            ...useCaseConfigureResponse.data,
            connector: {
              id: 'servicenow-1',
              name: 'My connector',
              type: ConnectorTypes.serviceNowITSM,
              fields: null,
            },
          },
        }))
        .mockImplementation(() => ({
          ...useCaseConfigureResponse,
          data: {
            ...useCaseConfigureResponse.data,
            connector: {
              id: 'resilient-2',
              name: 'My Resilient connector',
              type: ConnectorTypes.resilient,
              fields: null,
            },
          },
        }));

      wrapper = mount(<ConfigureCases />, {
        wrappingComponent: TestProviders as ComponentType<React.PropsWithChildren<{}>>,
      });

      wrapper.find('button[data-test-subj="dropdown-connectors"]').simulate('click');
      wrapper.update();
      wrapper.find('button[data-test-subj="dropdown-connector-resilient-2"]').simulate('click');
      wrapper.update();

      expect(
        wrapper
          .find('button[data-test-subj="case-configure-update-selected-connector-button"]')
          .text()
      ).toBe('Update My Resilient connector');
    });
  });

  describe('closure options', () => {
    let wrapper: ReactWrapper;
    let persistCaseConfigure: jest.Mock;

    beforeEach(() => {
      persistCaseConfigure = jest.fn();
      useGetCaseConfigurationMock.mockImplementation(() => ({
        ...useCaseConfigureResponse,
        data: {
          ...useCaseConfigureResponse.data,
          mapping: null,
          closureType: 'close-by-user',
          connector: {
            id: 'servicenow-1',
            name: 'My connector',
            type: ConnectorTypes.serviceNowITSM,
            fields: null,
          },
        },
      }));

      usePersistConfigurationMock.mockImplementation(() => ({
        ...usePersistConfigurationMockResponse,
        mutate: persistCaseConfigure,
      }));
      useGetConnectorsMock.mockImplementation(() => useConnectorsResponse);
      useGetUrlSearchMock.mockImplementation(() => searchURL);

      wrapper = mount(<ConfigureCases />, {
        wrappingComponent: TestProviders as ComponentType<React.PropsWithChildren<{}>>,
      });
    });

    test('it submits the configuration correctly when changing closure type', () => {
      wrapper.find('input[id="close-by-pushing"]').simulate('change');
      wrapper.update();

      expect(persistCaseConfigure).toHaveBeenCalled();
      expect(persistCaseConfigure).toHaveBeenCalledWith({
        connector: {
          id: 'servicenow-1',
          name: 'My connector',
          type: ConnectorTypes.serviceNowITSM,
          fields: null,
        },
        closureType: 'close-by-pushing',
        customFields: [],
        templates: [],
        id: '',
        version: '',
      });
    });
  });

  describe('user interactions', () => {
    beforeEach(() => {
      useGetCaseConfigurationMock.mockImplementation(() => ({
        ...useCaseConfigureResponse,
        data: {
          ...useCaseConfigureResponse.data,

          mapping: null,
          closureType: 'close-by-user',
          connector: {
            id: 'resilient-2',
            name: 'unchanged',
            type: ConnectorTypes.resilient,
            fields: null,
          },
        },
      }));

      useGetConnectorsMock.mockImplementation(() => useConnectorsResponse);
      useGetUrlSearchMock.mockImplementation(() => searchURL);
    });

    test('it show the add flyout when pressing the add connector button', async () => {
      const wrapper = mount(<ConfigureCases />, {
        wrappingComponent: TestProviders as ComponentType<React.PropsWithChildren<{}>>,
      });

      wrapper.find('button[data-test-subj="add-new-connector"]').simulate('click');

      await waitFor(() => {
        wrapper.update();
        expect(wrapper.find('[data-test-subj="add-connector-flyout"]').exists()).toBe(true);
        expect(getAddConnectorFlyoutMock).toHaveBeenCalledWith(
          expect.objectContaining({
            featureId: 'cases',
          })
        );
      });
    });

    test('it show the edit flyout when pressing the update connector button', async () => {
      const actionType = actionTypeRegistryMock.createMockActionTypeModel({
        id: '.resilient',
        validateParams: () => {
          const validationResult = { errors: {} };
          return Promise.resolve(validationResult);
        },
        actionConnectorFields: null,
      });

      useKibanaMock().services.triggersActionsUi.actionTypeRegistry.get = jest
        .fn()
        .mockReturnValue(actionType);
      useKibanaMock().services.triggersActionsUi.actionTypeRegistry.has = jest
        .fn()
        .mockReturnValue(true);

      const wrapper = mount(<ConfigureCases />, {
        wrappingComponent: TestProviders as ComponentType<React.PropsWithChildren<{}>>,
      });
      wrapper
        .find('button[data-test-subj="case-configure-update-selected-connector-button"]')
        .simulate('click');

      await waitFor(() => {
        wrapper.update();
        expect(wrapper.find('[data-test-subj="edit-connector-flyout"]').exists()).toBe(true);
        expect(getEditConnectorFlyoutMock).toHaveBeenCalledWith(
          expect.objectContaining({ connector: connectors[1] })
        );
      });

      expect(
        wrapper.find('[data-test-subj="case-configure-action-bottom-bar"]').exists()
      ).toBeFalsy();
    });
  });

  describe('custom fields', () => {
    let appMockRender: AppMockRenderer;
    let persistCaseConfigure: jest.Mock;

    beforeEach(() => {
      jest.clearAllMocks();
      appMockRender = createAppMockRenderer();
      persistCaseConfigure = jest.fn();
      usePersistConfigurationMock.mockImplementation(() => ({
        ...usePersistConfigurationMockResponse,
        mutate: persistCaseConfigure,
      }));
    });

    it('renders custom field group when no custom fields available', () => {
      appMockRender.render(<ConfigureCases />);

      expect(screen.getByTestId('custom-fields-form-group')).toBeInTheDocument();
    });

    it('renders custom field when available', () => {
      const customFieldsMock: CustomFieldsConfiguration = [
        {
          key: 'random_custom_key',
          label: 'summary',
          type: CustomFieldTypes.TEXT,
          required: true,
        },
      ];

      useGetCaseConfigurationMock.mockImplementation(() => ({
        ...useCaseConfigureResponse,
        data: {
          ...useCaseConfigureResponse.data,
          customFields: customFieldsMock,
        },
      }));

      appMockRender.render(<ConfigureCases />);

      expect(
        screen.getByTestId(`custom-field-${customFieldsMock[0].key}-${customFieldsMock[0].type}`)
      ).toBeInTheDocument();
    });

    it('renders multiple custom field when available', () => {
      useGetCaseConfigurationMock.mockImplementation(() => ({
        ...useCaseConfigureResponse,
        data: {
          ...useCaseConfigureResponse.data,
          customFields: customFieldsConfigurationMock,
        },
      }));

      appMockRender.render(<ConfigureCases />);

      const list = screen.getByTestId('custom-fields-list');

      for (const field of customFieldsConfigurationMock) {
        expect(
          within(list).getByTestId(`custom-field-${field.key}-${field.type}`)
        ).toBeInTheDocument();
      }
    });

    it('deletes a custom field correctly', async () => {
      useGetCaseConfigurationMock.mockImplementation(() => ({
        ...useCaseConfigureResponse,
        data: {
          ...useCaseConfigureResponse.data,
          customFields: customFieldsConfigurationMock,
        },
      }));

      appMockRender.render(<ConfigureCases />);

      const list = screen.getByTestId('custom-fields-list');

      await userEvent.click(
        within(list).getByTestId(`${customFieldsConfigurationMock[0].key}-custom-field-delete`)
      );

      expect(await screen.findByTestId('confirm-delete-modal')).toBeInTheDocument();

      await userEvent.click(screen.getByText('Delete'));

      await waitFor(() => {
        expect(persistCaseConfigure).toHaveBeenCalledWith({
          connector: {
            id: 'none',
            name: 'none',
            type: ConnectorTypes.none,
            fields: null,
          },
          closureType: 'close-by-user',
          customFields: [
            { ...customFieldsConfigurationMock[1] },
            { ...customFieldsConfigurationMock[2] },
            { ...customFieldsConfigurationMock[3] },
            { ...customFieldsConfigurationMock[4] },
            { ...customFieldsConfigurationMock[5] },
          ],
          templates: [],
          id: '',
          version: '',
        });
      });
    });

    it('deletes a custom field from template while deleting custom field from configuration', async () => {
      useGetCaseConfigurationMock.mockImplementation(() => ({
        ...useCaseConfigureResponse,
        data: {
          ...useCaseConfigureResponse.data,
          customFields: customFieldsConfigurationMock,
          templates: [
            {
              key: 'test_template_4',
              name: 'Fourth test template',
              caseFields: {
                title: 'Case with sample template 4',
                description: 'case desc',
                customFields: [
                  {
                    key: customFieldsConfigurationMock[0].key,
                    type: CustomFieldTypes.TEXT,
                    value: 'this is a text field value',
                  },
                ],
              },
            },
          ],
        },
      }));

      appMockRender.render(<ConfigureCases />);

      const list = await screen.findByTestId('custom-fields-list');

      await userEvent.click(
        within(list).getByTestId(`${customFieldsConfigurationMock[0].key}-custom-field-delete`)
      );

      expect(await screen.findByTestId('confirm-delete-modal')).toBeInTheDocument();

      await userEvent.click(screen.getByText('Delete'));

      await waitFor(() => {
        expect(persistCaseConfigure).toHaveBeenCalledWith({
          connector: {
            id: 'none',
            name: 'none',
            type: ConnectorTypes.none,
            fields: null,
          },
          closureType: 'close-by-user',
          customFields: [
            { ...customFieldsConfigurationMock[1] },
            { ...customFieldsConfigurationMock[2] },
            { ...customFieldsConfigurationMock[3] },
            { ...customFieldsConfigurationMock[4] },
            { ...customFieldsConfigurationMock[5] },
          ],
          templates: [
            {
              key: 'test_template_4',
              name: 'Fourth test template',
              caseFields: {
                title: 'Case with sample template 4',
                description: 'case desc',
                customFields: [],
              },
            },
          ],
          id: '',
          version: '',
        });
      });
    });

    it('adds a custom field to template while adding a new custom field', async () => {
      useGetCaseConfigurationMock.mockImplementation(() => ({
        ...useCaseConfigureResponse,
        data: {
          ...useCaseConfigureResponse.data,
          customFields: customFieldsConfigurationMock,
          templates: [
            {
              key: 'test_template_4',
              name: 'Fourth test template',
              caseFields: null,
            },
          ],
        },
      }));

      appMockRender.render(<ConfigureCases />);

      await userEvent.click(await screen.findByTestId(`add-custom-field`));

      expect(await screen.findByTestId('common-flyout')).toBeInTheDocument();

      await userEvent.click(screen.getByTestId('custom-field-label-input'));
      await userEvent.paste('New custom field');
      await userEvent.click(screen.getByTestId('text-custom-field-required'));
      await userEvent.click(screen.getByTestId('text-custom-field-default-value'));
      await userEvent.paste('This is a default value');

      await userEvent.click(screen.getByTestId('common-flyout-save'));

      await waitFor(() => {
        expect(persistCaseConfigure).toHaveBeenCalledWith({
          connector: {
            id: 'none',
            name: 'none',
            type: ConnectorTypes.none,
            fields: null,
          },
          closureType: 'close-by-user',
          customFields: [
            ...customFieldsConfigurationMock,
            {
              key: expect.anything(),
              label: 'New custom field',
              type: CustomFieldTypes.TEXT as const,
              required: true,
              defaultValue: 'This is a default value',
            },
          ],
          templates: [
            {
              key: 'test_template_4',
              name: 'Fourth test template',
              caseFields: {
                customFields: [
                  {
                    key: customFieldsConfigurationMock[0].key,
                    type: customFieldsConfigurationMock[0].type,
                    value: customFieldsConfigurationMock[0].defaultValue,
                  },
                  {
                    key: customFieldsConfigurationMock[1].key,
                    type: customFieldsConfigurationMock[1].type,
                    value: customFieldsConfigurationMock[1].defaultValue,
                  },
                  {
                    key: customFieldsConfigurationMock[2].key,
                    type: customFieldsConfigurationMock[2].type,
                    value: null,
                  },
                  {
                    key: customFieldsConfigurationMock[3].key,
                    type: customFieldsConfigurationMock[3].type,
                    value: false,
                  },
                  {
                    key: customFieldsConfigurationMock[4].key,
                    type: customFieldsConfigurationMock[4].type,
                    value: customFieldsConfigurationMock[4].defaultValue,
                  },
                  {
                    key: customFieldsConfigurationMock[5].key,
                    type: customFieldsConfigurationMock[5].type,
                    value: null,
                  },
                  {
                    key: expect.anything(),
                    type: CustomFieldTypes.TEXT as const,
                    value: 'This is a default value',
                  },
                ],
              },
            },
          ],
          id: '',
          version: '',
        });
      });
    });

    it('updates a custom field correctly', async () => {
      useGetCaseConfigurationMock.mockImplementation(() => ({
        ...useCaseConfigureResponse,
        data: {
          ...useCaseConfigureResponse.data,
          customFields: customFieldsConfigurationMock,
        },
      }));

      appMockRender.render(<ConfigureCases />);

      const list = screen.getByTestId('custom-fields-list');

      await userEvent.click(
        within(list).getByTestId(`${customFieldsConfigurationMock[0].key}-custom-field-edit`)
      );

      expect(await screen.findByTestId('common-flyout')).toBeInTheDocument();

      expect(await screen.findByTestId('common-flyout-header')).toHaveTextContent(
        i18n.EDIT_CUSTOM_FIELD
      );

      await userEvent.click(screen.getByTestId('custom-field-label-input'));
      await userEvent.paste('!!');
      await userEvent.click(screen.getByTestId('text-custom-field-required'));
      await userEvent.click(screen.getByTestId('common-flyout-save'));

      await waitFor(() => {
        expect(persistCaseConfigure).toHaveBeenCalledWith({
          connector: {
            id: 'none',
            name: 'none',
            type: ConnectorTypes.none,
            fields: null,
          },
          closureType: 'close-by-user',
          customFields: [
            {
              key: customFieldsConfigurationMock[0].key,
              type: customFieldsConfigurationMock[0].type,
              label: `${customFieldsConfigurationMock[0].label}!!`,
              required: !customFieldsConfigurationMock[0].required,
              defaultValue: customFieldsConfigurationMock[0].defaultValue,
            },
            { ...customFieldsConfigurationMock[1] },
            { ...customFieldsConfigurationMock[2] },
            { ...customFieldsConfigurationMock[3] },
            { ...customFieldsConfigurationMock[4] },
            { ...customFieldsConfigurationMock[5] },
          ],
          templates: [],
          id: '',
          version: '',
        });
      });
    });

    it('opens fly out for when click on add field', async () => {
      appMockRender.render(<ConfigureCases />);

      await userEvent.click(screen.getByTestId('add-custom-field'));

      expect(await screen.findByTestId('common-flyout')).toBeInTheDocument();

      expect(await screen.findByTestId('common-flyout-header')).toHaveTextContent(
        i18n.ADD_CUSTOM_FIELD
      );
    });

    it('closes fly out for when click on cancel', async () => {
      appMockRender.render(<ConfigureCases />);

      await userEvent.click(screen.getByTestId('add-custom-field'));

      expect(await screen.findByTestId('common-flyout')).toBeInTheDocument();

      await userEvent.click(screen.getByTestId('common-flyout-cancel'));

      expect(await screen.findByTestId('custom-fields-form-group')).toBeInTheDocument();
      expect(screen.queryByTestId('common-flyout')).not.toBeInTheDocument();
    });

    it('closes fly out for when click on save field', async () => {
      appMockRender.render(<ConfigureCases />);

      await userEvent.click(screen.getByTestId('add-custom-field'));

      expect(await screen.findByTestId('common-flyout')).toBeInTheDocument();

      await userEvent.click(screen.getByTestId('custom-field-label-input'));
      await userEvent.paste('Summary');

      await userEvent.click(screen.getByTestId('common-flyout-save'));

      await waitFor(() => {
        expect(persistCaseConfigure).toHaveBeenCalledWith({
          connector: {
            id: 'none',
            name: 'none',
            type: ConnectorTypes.none,
            fields: null,
          },
          closureType: 'close-by-user',
          customFields: [
            ...customFieldsConfigurationMock,
            {
              key: expect.anything(),
              label: 'Summary',
              type: CustomFieldTypes.TEXT,
              required: false,
            },
          ],
          templates: [],
          id: '',
          version: '',
        });
      });

      expect(screen.getByTestId('custom-fields-form-group')).toBeInTheDocument();
      expect(screen.queryByTestId('common-flyout')).not.toBeInTheDocument();
    });
  });

  describe('templates', () => {
    let appMockRender: AppMockRenderer;
    const persistCaseConfigure = jest.fn();

    beforeEach(() => {
      jest.clearAllMocks();
      appMockRender = createAppMockRenderer();
      usePersistConfigurationMock.mockImplementation(() => ({
        ...usePersistConfigurationMockResponse,
        mutate: persistCaseConfigure,
      }));
      useLicenseMock.mockReturnValue({ isAtLeastPlatinum: () => false, isAtLeastGold: () => true });
    });

    it('should render template section', async () => {
      appMockRender.render(<ConfigureCases />);

      expect(await screen.findByTestId('templates-form-group')).toBeInTheDocument();
      expect(await screen.findByTestId('add-template')).toBeInTheDocument();
    });

    it('should render template form in flyout', async () => {
      appMockRender.render(<ConfigureCases />);

      expect(await screen.findByTestId('templates-form-group')).toBeInTheDocument();

      await userEvent.click(await screen.findByTestId('add-template'));

      expect(await screen.findByTestId('common-flyout')).toBeInTheDocument();
      expect(await screen.findByTestId('common-flyout-header')).toHaveTextContent(
        i18n.CREATE_TEMPLATE
      );
      expect(await screen.findByTestId('template-creation-form-steps')).toBeInTheDocument();
    });

    it('should add template', async () => {
      appMockRender.render(<ConfigureCases />);

      expect(await screen.findByTestId('templates-form-group')).toBeInTheDocument();

      await userEvent.click(await screen.findByTestId('add-template'));

      expect(await screen.findByTestId('common-flyout')).toBeInTheDocument();

      await userEvent.click(await screen.findByTestId('template-name-input'));
      await userEvent.paste('Template name');
      await userEvent.click(await screen.findByTestId('template-description-input'));
      await userEvent.paste('Template description');

      const caseTitle = await screen.findByTestId('caseTitle');
      await userEvent.click(within(caseTitle).getByTestId('input'));
      await userEvent.paste('Case using template');

      await userEvent.click(screen.getByTestId('common-flyout-save'));

      await waitFor(() => {
        expect(persistCaseConfigure).toHaveBeenCalledWith({
          connector: {
            id: 'none',
            name: 'none',
            type: ConnectorTypes.none,
            fields: null,
          },
          closureType: 'close-by-user',
          customFields: customFieldsConfigurationMock,
          templates: [
            {
              key: expect.anything(),
              name: 'Template name',
              description: 'Template description',
              tags: [],
              caseFields: {
                title: 'Case using template',
                connector: {
                  id: 'none',
                  name: 'none',
                  type: ConnectorTypes.none,
                  fields: null,
                },
                settings: {
                  syncAlerts: true,
                },
                customFields: [
                  {
                    key: customFieldsConfigurationMock[0].key,
                    type: customFieldsConfigurationMock[0].type,
                    value: customFieldsConfigurationMock[0].defaultValue,
                  },
                  {
                    key: customFieldsConfigurationMock[1].key,
                    type: customFieldsConfigurationMock[1].type,
                    value: customFieldsConfigurationMock[1].defaultValue,
                  },
                  {
                    key: customFieldsConfigurationMock[2].key,
                    type: customFieldsConfigurationMock[2].type,
                    value: null,
                  },
                  {
                    key: customFieldsConfigurationMock[3].key,
                    type: customFieldsConfigurationMock[3].type,
                    value: false, // when no default value for toggle, we set it to false
                  },
                  {
                    key: customFieldsConfigurationMock[4].key,
                    type: customFieldsConfigurationMock[4].type,
                    value: customFieldsConfigurationMock[4].defaultValue,
                  },
                  {
                    key: customFieldsConfigurationMock[5].key,
                    type: customFieldsConfigurationMock[5].type,
                    value: null,
                  },
                ],
              },
            },
          ],
          id: '',
          version: '',
        });
      });

      expect(screen.getByTestId('templates-form-group')).toBeInTheDocument();
      expect(screen.queryByTestId('common-flyout')).not.toBeInTheDocument();
    });

    it('should delete a template', async () => {
      useGetConnectorsMock.mockImplementation(() => useConnectorsResponse);

      useGetCaseConfigurationMock.mockImplementation(() => ({
        ...useCaseConfigureResponse,
        data: {
          ...useCaseConfigureResponse.data,
          templates: templatesConfigurationMock,
        },
      }));

      appMockRender.render(<ConfigureCases />);

      const list = screen.getByTestId('templates-list');

      await userEvent.click(
        within(list).getByTestId(`${templatesConfigurationMock[0].key}-template-delete`)
      );

      expect(await screen.findByTestId('confirm-delete-modal')).toBeInTheDocument();

      await userEvent.click(screen.getByText('Delete'));

      await waitFor(() => {
        expect(persistCaseConfigure).toHaveBeenCalledWith({
          connector: {
            id: 'none',
            name: 'none',
            type: ConnectorTypes.none,
            fields: null,
          },
          closureType: 'close-by-user',
          customFields: [],
          templates: [
            { ...templatesConfigurationMock[1] },
            { ...templatesConfigurationMock[2] },
            { ...templatesConfigurationMock[3] },
            { ...templatesConfigurationMock[4] },
          ],
          id: '',
          version: '',
        });
      });
    });

    it('should update a template', async () => {
      useGetCaseConfigurationMock.mockImplementation(() => ({
        ...useCaseConfigureResponse,
        data: {
          ...useCaseConfigureResponse.data,
          templates: [templatesConfigurationMock[0], templatesConfigurationMock[3]],
        },
      }));

      appMockRender.render(<ConfigureCases />);

      const list = screen.getByTestId('templates-list');

      await userEvent.click(
        within(list).getByTestId(`${templatesConfigurationMock[0].key}-template-edit`)
      );

      expect(await screen.findByTestId('common-flyout')).toBeInTheDocument();

      expect(await screen.findByTestId('common-flyout-header')).toHaveTextContent(
        i18n.EDIT_TEMPLATE
      );

      await userEvent.clear(await screen.findByTestId('template-name-input'));
      await userEvent.click(await screen.findByTestId('template-name-input'));
      await userEvent.paste('Updated template name');

      await userEvent.click(screen.getByTestId('common-flyout-save'));

      await waitFor(() => {
        expect(persistCaseConfigure).toHaveBeenCalledWith({
          connector: {
            id: 'none',
            name: 'none',
            type: ConnectorTypes.none,
            fields: null,
          },
          closureType: 'close-by-user',
          customFields: [],
          templates: [
            {
              ...templatesConfigurationMock[0],
              name: 'Updated template name',
              tags: [],
              caseFields: {
                connector: {
                  fields: null,
                  id: 'none',
                  name: 'none',
                  type: '.none',
                },
                customFields: [],
                settings: {
                  syncAlerts: true,
                },
              },
            },
            { ...templatesConfigurationMock[3] },
          ],
          id: '',
          version: '',
        });
      });
    });
  });

  describe('rendering with license limitations', () => {
    let appMockRender: AppMockRenderer;
    let persistCaseConfigure: jest.Mock;
    beforeEach(() => {
      // Default setup
      jest.clearAllMocks();
      useGetConnectorsMock.mockImplementation(() => ({ useConnectorsResponse }));
      appMockRender = createAppMockRenderer();
      persistCaseConfigure = jest.fn();
      usePersistConfigurationMock.mockImplementation(() => ({
        ...usePersistConfigurationMockResponse,
        mutate: persistCaseConfigure,
      }));
      useGetCaseConfigurationMock.mockImplementation(() => useCaseConfigureResponse);

      // Updated
      useLicenseMock.mockReturnValue({ isAtLeastGold: () => false });
    });

    it('should not render connectors and closure options', () => {
      appMockRender.render(<ConfigureCases />);
      expect(screen.queryByTestId('dropdown-connectors')).not.toBeInTheDocument();
      expect(screen.queryByTestId('closure-options-radio-group')).not.toBeInTheDocument();
    });

    it('should render custom field section', () => {
      appMockRender.render(<ConfigureCases />);
      expect(screen.getByTestId('custom-fields-form-group')).toBeInTheDocument();
    });

    describe('when the previously selected connector doesnt appear due to license downgrade or because it was deleted', () => {
      beforeEach(() => {
        useGetCaseConfigurationMock.mockImplementation(() => ({
          data: {
            ...useCaseConfigureResponse.data,
            closureType: 'close-by-user',
            connector: {
              id: 'not-id',
              name: 'unchanged',
              type: ConnectorTypes.none,
              fields: null,
            },
          },
        }));
      });

      it('should not render the warning callout', () => {
        expect(screen.queryByTestId('configure-cases-warning-callout')).not.toBeInTheDocument();
      });
    });
  });
});
