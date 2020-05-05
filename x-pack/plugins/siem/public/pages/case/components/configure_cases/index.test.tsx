/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { ReactWrapper, mount } from 'enzyme';

import { ConfigureCases } from './';
import { TestProviders } from '../../../../mock';
import { Connectors } from './connectors';
import { ClosureOptions } from './closure_options';
import { Mapping } from './mapping';
import {
  ActionsConnectorsContextProvider,
  ConnectorAddFlyout,
  ConnectorEditFlyout,
} from '../../../../../../triggers_actions_ui/public';
import { EuiBottomBar } from '@elastic/eui';

import { useKibana } from '../../../../lib/kibana';
import { useConnectors } from '../../../../containers/case/configure/use_connectors';
import { useCaseConfigure } from '../../../../containers/case/configure/use_configure';
import { useGetUrlSearch } from '../../../../components/navigation/use_get_url_search';

import {
  connectors,
  searchURL,
  useCaseConfigureResponse,
  useConnectorsResponse,
  kibanaMockImplementationArgs,
  mapping,
} from './__mock__';

jest.mock('../../../../lib/kibana');
jest.mock('../../../../containers/case/configure/use_connectors');
jest.mock('../../../../containers/case/configure/use_configure');
jest.mock('../../../../components/navigation/use_get_url_search');

const useKibanaMock = useKibana as jest.Mock;
const useConnectorsMock = useConnectors as jest.Mock;
const useCaseConfigureMock = useCaseConfigure as jest.Mock;
const useGetUrlSearchMock = useGetUrlSearch as jest.Mock;
describe('ConfigureCases', () => {
  describe('rendering', () => {
    let wrapper: ReactWrapper;
    beforeEach(() => {
      jest.resetAllMocks();
      useCaseConfigureMock.mockImplementation(() => useCaseConfigureResponse);
      useConnectorsMock.mockImplementation(() => ({ ...useConnectorsResponse, connectors: [] }));
      useKibanaMock.mockImplementation(() => kibanaMockImplementationArgs);
      useGetUrlSearchMock.mockImplementation(() => searchURL);

      wrapper = mount(<ConfigureCases userCanCrud />, { wrappingComponent: TestProviders });
    });

    test('it renders the Connectors', () => {
      expect(wrapper.find('[data-test-subj="case-connectors-form-group"]').exists()).toBeTruthy();
    });

    test('it renders the ClosureType', () => {
      expect(
        wrapper.find('[data-test-subj="case-closure-options-form-group"]').exists()
      ).toBeTruthy();
    });

    test('it renders the Mapping', () => {
      expect(wrapper.find('[data-test-subj="case-mapping-form-group"]').exists()).toBeTruthy();
    });

    test('it renders the ActionsConnectorsContextProvider', () => {
      // Components from triggers_actions_ui do not have a data-test-subj
      expect(wrapper.find(ActionsConnectorsContextProvider).exists()).toBeTruthy();
    });

    test('it renders the ConnectorAddFlyout', () => {
      // Components from triggers_actions_ui do not have a data-test-subj
      expect(wrapper.find(ConnectorAddFlyout).exists()).toBeTruthy();
    });

    test('it does NOT render the ConnectorEditFlyout', () => {
      // Components from triggers_actions_ui do not have a data-test-subj
      expect(wrapper.find(ConnectorEditFlyout).exists()).toBeFalsy();
    });

    test('it does NOT render the EuiCallOut', () => {
      expect(
        wrapper.find('[data-test-subj="configure-cases-warning-callout"]').exists()
      ).toBeFalsy();
    });

    test('it does NOT render the EuiBottomBar', () => {
      expect(
        wrapper.find('[data-test-subj="case-configure-action-bottom-bar"]').exists()
      ).toBeFalsy();
    });

    test('it disables correctly ClosureOptions when the connector is set to none', () => {
      expect(wrapper.find(ClosureOptions).prop('disabled')).toBe(true);
    });
  });

  describe('Unhappy path', () => {
    let wrapper: ReactWrapper;
    beforeEach(() => {
      jest.resetAllMocks();
      useCaseConfigureMock.mockImplementation(() => ({
        ...useCaseConfigureResponse,
        closureType: 'close-by-user',
        connectorId: 'not-id',
        connectorName: 'unchanged',
        currentConfiguration: {
          connectorName: 'unchanged',
          connectorId: 'not-id',
          closureType: 'close-by-user',
        },
      }));
      useConnectorsMock.mockImplementation(() => ({ ...useConnectorsResponse, connectors: [] }));
      useKibanaMock.mockImplementation(() => kibanaMockImplementationArgs);
      useGetUrlSearchMock.mockImplementation(() => searchURL);
      wrapper = mount(<ConfigureCases userCanCrud />, { wrappingComponent: TestProviders });
    });

    test('it shows the warning callout when configuration is invalid', () => {
      expect(
        wrapper.find('[data-test-subj="configure-cases-warning-callout"]').exists()
      ).toBeTruthy();
    });

    test('it disables the update connector button when the connectorId is invalid', () => {
      expect(wrapper.find(Mapping).prop('disabled')).toBe(true);
    });
  });

  describe('Happy path', () => {
    let wrapper: ReactWrapper;

    beforeEach(() => {
      jest.resetAllMocks();
      useCaseConfigureMock.mockImplementation(() => ({
        ...useCaseConfigureResponse,
        mapping,
        closureType: 'close-by-user',
        connectorId: '123',
        connectorName: 'unchanged',
        currentConfiguration: {
          connectorName: 'unchanged',
          connectorId: '123',
          closureType: 'close-by-user',
        },
      }));
      useConnectorsMock.mockImplementation(() => useConnectorsResponse);
      useKibanaMock.mockImplementation(() => kibanaMockImplementationArgs);
      useGetUrlSearchMock.mockImplementation(() => searchURL);

      wrapper = mount(<ConfigureCases userCanCrud />, { wrappingComponent: TestProviders });
    });

    test('it renders the ConnectorEditFlyout', () => {
      expect(wrapper.find(ConnectorEditFlyout).exists()).toBeTruthy();
    });

    test('it renders with correct props', () => {
      // Connector
      expect(wrapper.find(Connectors).prop('connectors')).toEqual(connectors);
      expect(wrapper.find(Connectors).prop('disabled')).toBe(false);
      expect(wrapper.find(Connectors).prop('isLoading')).toBe(false);
      expect(wrapper.find(Connectors).prop('selectedConnector')).toBe('123');

      // ClosureOptions
      expect(wrapper.find(ClosureOptions).prop('disabled')).toBe(false);
      expect(wrapper.find(ClosureOptions).prop('closureTypeSelected')).toBe('close-by-user');

      // Mapping
      expect(wrapper.find(Mapping).prop('disabled')).toBe(true);
      expect(wrapper.find(Mapping).prop('updateConnectorDisabled')).toBe(false);
      expect(wrapper.find(Mapping).prop('mapping')).toEqual(
        connectors[0].config.casesConfiguration.mapping
      );

      // Flyouts
      expect(wrapper.find(ConnectorAddFlyout).prop('addFlyoutVisible')).toBe(false);
      expect(wrapper.find(ConnectorAddFlyout).prop('actionTypes')).toEqual([
        {
          id: '.servicenow',
          name: 'ServiceNow',
          enabled: true,
          logo: 'test-file-stub',
          enabledInConfig: true,
          enabledInLicense: true,
          minimumLicenseRequired: 'platinum',
        },
        {
          id: '.jira',
          name: 'Jira',
          logo: 'test-file-stub',
          enabled: true,
          enabledInConfig: true,
          enabledInLicense: true,
          minimumLicenseRequired: 'platinum',
        },
      ]);

      expect(wrapper.find(ConnectorEditFlyout).prop('editFlyoutVisible')).toBe(false);
      expect(wrapper.find(ConnectorEditFlyout).prop('initialConnector')).toEqual(connectors[0]);
    });

    test('it does not shows the action bar when there is no change', () => {
      expect(
        wrapper.find('[data-test-subj="case-configure-action-bottom-bar"]').exists()
      ).toBeFalsy();
    });

    test('it disables the mapping permanently', () => {
      expect(wrapper.find(Mapping).prop('disabled')).toBe(true);
    });

    test('it sets the mapping of a connector correctly', () => {
      expect(wrapper.find(Mapping).prop('mapping')).toEqual(
        connectors[0].config.casesConfiguration.mapping
      );
    });

    // TODO: When mapping is enabled the test.todo should be implemented.
    test.todo('the mapping is changed successfully when changing the third party');
    test.todo('the mapping is changed successfully when changing the action type');
    test.todo('it disables the update connector button when loading the configuration');

    test('it disables correctly when the user cannot crud', () => {
      const newWrapper = mount(<ConfigureCases userCanCrud={false} />, {
        wrappingComponent: TestProviders,
      });

      expect(newWrapper.find(Connectors).prop('disabled')).toBe(true);
      expect(newWrapper.find(ClosureOptions).prop('disabled')).toBe(true);
      expect(newWrapper.find(Mapping).prop('disabled')).toBe(true);
      expect(newWrapper.find(Mapping).prop('updateConnectorDisabled')).toBe(true);
    });
  });

  describe('loading connectors', () => {
    let wrapper: ReactWrapper;

    beforeEach(() => {
      jest.resetAllMocks();
      jest.restoreAllMocks();
      jest.clearAllMocks();
      useCaseConfigureMock.mockImplementation(() => useCaseConfigureResponse);
      useConnectorsMock.mockImplementation(() => ({
        ...useConnectorsResponse,
        loading: true,
      }));
      useKibanaMock.mockImplementation(() => kibanaMockImplementationArgs);
      useGetUrlSearchMock.mockImplementation(() => searchURL);
      wrapper = mount(<ConfigureCases userCanCrud />, { wrappingComponent: TestProviders });
    });

    test('it disables correctly Connector when loading connectors', () => {
      expect(wrapper.find(Connectors).prop('disabled')).toBe(true);
    });

    test('it pass the correct value to isLoading attribute on Connector', () => {
      expect(wrapper.find(Connectors).prop('isLoading')).toBe(true);
    });

    test('it disables correctly ClosureOptions when loading connectors', () => {
      expect(wrapper.find(ClosureOptions).prop('disabled')).toBe(true);
    });

    test('it disables the update connector button when loading the connectors', () => {
      expect(wrapper.find(Mapping).prop('disabled')).toBe(true);
    });
    test('it disables the buttons of action bar when loading connectors', () => {
      useCaseConfigureMock.mockImplementation(() => ({
        ...useCaseConfigureResponse,
        mapping,
        closureType: 'close-by-user',
        connectorId: '456',
        connectorName: 'unchanged',
        currentConfiguration: {
          connectorName: 'unchanged',
          connectorId: '123',
          closureType: 'close-by-user',
        },
      }));
      const newWrapper = mount(<ConfigureCases userCanCrud />, {
        wrappingComponent: TestProviders,
      });

      expect(
        newWrapper
          .find('[data-test-subj="case-configure-action-bottom-bar-cancel-button"]')
          .first()
          .prop('isDisabled')
      ).toBe(true);

      expect(
        newWrapper
          .find('[data-test-subj="case-configure-action-bottom-bar-save-button"]')
          .first()
          .prop('isDisabled')
      ).toBe(true);
    });
  });

  describe('saving configuration', () => {
    let wrapper: ReactWrapper;

    beforeEach(() => {
      jest.resetAllMocks();
      useCaseConfigureMock.mockImplementation(() => ({
        ...useCaseConfigureResponse,
        persistLoading: true,
      }));

      useConnectorsMock.mockImplementation(() => useConnectorsResponse);
      useKibanaMock.mockImplementation(() => kibanaMockImplementationArgs);
      useGetUrlSearchMock.mockImplementation(() => searchURL);
      wrapper = mount(<ConfigureCases userCanCrud />, { wrappingComponent: TestProviders });
    });

    test('it disables correctly Connector when saving configuration', () => {
      expect(wrapper.find(Connectors).prop('disabled')).toBe(true);
    });

    test('it disables correctly ClosureOptions when saving configuration', () => {
      expect(wrapper.find(ClosureOptions).prop('disabled')).toBe(true);
    });

    test('it disables the update connector button when saving the configuration', () => {
      expect(wrapper.find(Mapping).prop('disabled')).toBe(true);
    });

    test('it disables the buttons of action bar when saving configuration', () => {
      useCaseConfigureMock.mockImplementation(() => ({
        ...useCaseConfigureResponse,
        mapping,
        closureType: 'close-by-user',
        connectorId: '456',
        connectorName: 'unchanged',
        currentConfiguration: {
          connectorName: 'unchanged',
          connectorId: '123',
          closureType: 'close-by-user',
        },
        persistLoading: true,
      }));

      const newWrapper = mount(<ConfigureCases userCanCrud />, {
        wrappingComponent: TestProviders,
      });

      expect(
        newWrapper
          .find('[data-test-subj="case-configure-action-bottom-bar-cancel-button"]')
          .first()
          .prop('isDisabled')
      ).toBe(true);

      expect(
        newWrapper
          .find('[data-test-subj="case-configure-action-bottom-bar-save-button"]')
          .first()
          .prop('isDisabled')
      ).toBe(true);
    });

    test('it shows the loading spinner when saving configuration', () => {
      useCaseConfigureMock.mockImplementation(() => ({
        ...useCaseConfigureResponse,
        mapping,
        closureType: 'close-by-user',
        connectorId: '456',
        connectorName: 'unchanged',
        currentConfiguration: {
          connectorName: 'unchanged',
          connectorId: '123',
          closureType: 'close-by-user',
        },
        persistLoading: true,
      }));

      const newWrapper = mount(<ConfigureCases userCanCrud />, {
        wrappingComponent: TestProviders,
      });

      expect(
        newWrapper
          .find('[data-test-subj="case-configure-action-bottom-bar-cancel-button"]')
          .first()
          .prop('isLoading')
      ).toBe(true);

      expect(
        newWrapper
          .find('[data-test-subj="case-configure-action-bottom-bar-save-button"]')
          .first()
          .prop('isLoading')
      ).toBe(true);
    });
  });

  describe('update connector', () => {
    let wrapper: ReactWrapper;
    const persistCaseConfigure = jest.fn();

    beforeEach(() => {
      jest.resetAllMocks();
      useCaseConfigureMock.mockImplementation(() => ({
        ...useCaseConfigureResponse,
        mapping,
        closureType: 'close-by-user',
        connectorId: '456',
        connectorName: 'unchanged',
        currentConfiguration: {
          connectorName: 'unchanged',
          connectorId: '123',
          closureType: 'close-by-user',
        },
        persistCaseConfigure,
      }));
      useConnectorsMock.mockImplementation(() => useConnectorsResponse);
      useKibanaMock.mockImplementation(() => kibanaMockImplementationArgs);
      useGetUrlSearchMock.mockImplementation(() => searchURL);

      wrapper = mount(<ConfigureCases userCanCrud />, { wrappingComponent: TestProviders });
    });

    test('it submits the configuration correctly', () => {
      wrapper
        .find('[data-test-subj="case-configure-action-bottom-bar-save-button"]')
        .first()
        .simulate('click');

      wrapper.update();

      expect(persistCaseConfigure).toHaveBeenCalled();
      expect(persistCaseConfigure).toHaveBeenCalledWith({
        connectorId: '456',
        connectorName: 'My Connector 2',
        closureType: 'close-by-user',
      });
    });

    test('it has the correct url on cancel button', () => {
      expect(
        wrapper
          .find('[data-test-subj="case-configure-action-bottom-bar-cancel-button"]')
          .first()
          .prop('href')
      ).toBe(`#/link-to/case${searchURL}`);
    });
    test('it disables the buttons of action bar when loading configuration', () => {
      useCaseConfigureMock.mockImplementation(() => ({
        ...useCaseConfigureResponse,
        mapping,
        closureType: 'close-by-user',
        connectorId: '456',
        connectorName: 'unchanged',
        currentConfiguration: {
          connectorName: 'unchanged',
          connectorId: '123',
          closureType: 'close-by-user',
        },
        loading: true,
      }));
      const newWrapper = mount(<ConfigureCases userCanCrud />, {
        wrappingComponent: TestProviders,
      });

      expect(
        newWrapper
          .find('[data-test-subj="case-configure-action-bottom-bar-cancel-button"]')
          .first()
          .prop('isDisabled')
      ).toBe(true);

      expect(
        newWrapper
          .find('[data-test-subj="case-configure-action-bottom-bar-save-button"]')
          .first()
          .prop('isDisabled')
      ).toBe(true);
    });
  });

  describe('user interactions', () => {
    beforeEach(() => {
      jest.resetAllMocks();
      useCaseConfigureMock.mockImplementation(() => ({
        ...useCaseConfigureResponse,
        mapping,
        closureType: 'close-by-user',
        connectorId: '456',
        connectorName: 'unchanged',
        currentConfiguration: {
          connectorName: 'unchanged',
          connectorId: '456',
          closureType: 'close-by-user',
        },
      }));
      useConnectorsMock.mockImplementation(() => useConnectorsResponse);
      useKibanaMock.mockImplementation(() => kibanaMockImplementationArgs);
      useGetUrlSearchMock.mockImplementation(() => searchURL);
    });

    test('it show the add flyout when pressing the add connector button', () => {
      const wrapper = mount(<ConfigureCases userCanCrud />, { wrappingComponent: TestProviders });
      wrapper
        .find('button[data-test-subj="case-configure-add-connector-button"]')
        .simulate('click');
      wrapper.update();

      expect(wrapper.find(ConnectorAddFlyout).prop('addFlyoutVisible')).toBe(true);
      expect(wrapper.find(EuiBottomBar).exists()).toBeFalsy();
    });

    test('it show the edit flyout when pressing the update connector button', () => {
      const wrapper = mount(<ConfigureCases userCanCrud />, { wrappingComponent: TestProviders });
      wrapper
        .find('button[data-test-subj="case-mapping-update-connector-button"]')
        .simulate('click');
      wrapper.update();

      expect(wrapper.find(ConnectorEditFlyout).prop('editFlyoutVisible')).toBe(true);
      expect(wrapper.find(EuiBottomBar).exists()).toBeFalsy();
    });

    test('it tracks the changes successfully', () => {
      useCaseConfigureMock.mockImplementation(() => ({
        ...useCaseConfigureResponse,
        mapping,
        closureType: 'close-by-user',
        connectorId: '456',
        connectorName: 'unchanged',
        currentConfiguration: {
          connectorName: 'unchanged',
          connectorId: '123',
          closureType: 'close-by-pushing',
        },
      }));
      const wrapper = mount(<ConfigureCases userCanCrud />, { wrappingComponent: TestProviders });
      wrapper.find('button[data-test-subj="dropdown-connectors"]').simulate('click');
      wrapper.update();
      wrapper.find('button[data-test-subj="dropdown-connector-456"]').simulate('click');
      wrapper.update();
      wrapper.find('input[id="close-by-pushing"]').simulate('change');
      wrapper.update();

      expect(
        wrapper.find('[data-test-subj="case-configure-action-bottom-bar"]').exists()
      ).toBeTruthy();
      expect(
        wrapper
          .find('[data-test-subj="case-configure-action-bottom-bar-total-changes"]')
          .first()
          .text()
      ).toBe('2 unsaved changes');
    });
    test('it tracks the changes successfully when name changes', () => {
      useCaseConfigureMock.mockImplementation(() => ({
        ...useCaseConfigureResponse,
        mapping,
        closureType: 'close-by-user',
        connectorId: '456',
        connectorName: 'nameChange',
        currentConfiguration: {
          connectorId: '123',
          closureType: 'close-by-pushing',
          connectorName: 'before',
        },
      }));
      const wrapper = mount(<ConfigureCases userCanCrud />, { wrappingComponent: TestProviders });
      wrapper.find('button[data-test-subj="dropdown-connectors"]').simulate('click');
      wrapper.update();
      wrapper.find('button[data-test-subj="dropdown-connector-456"]').simulate('click');
      wrapper.update();
      wrapper.find('input[id="close-by-pushing"]').simulate('change');
      wrapper.update();

      expect(
        wrapper.find('[data-test-subj="case-configure-action-bottom-bar"]').exists()
      ).toBeTruthy();
      expect(
        wrapper
          .find('[data-test-subj="case-configure-action-bottom-bar-total-changes"]')
          .first()
          .text()
      ).toBe('2 unsaved changes');
    });

    test('it tracks and reverts the changes successfully ', () => {
      const wrapper = mount(<ConfigureCases userCanCrud />, { wrappingComponent: TestProviders });
      // change settings
      wrapper.find('button[data-test-subj="dropdown-connectors"]').simulate('click');
      wrapper.update();
      wrapper.find('button[data-test-subj="dropdown-connector-456"]').simulate('click');
      wrapper.update();
      wrapper.find('input[id="close-by-pushing"]').simulate('change');
      wrapper.update();

      // revert back to initial settings
      wrapper.find('button[data-test-subj="dropdown-connectors"]').simulate('click');
      wrapper.update();
      wrapper.find('button[data-test-subj="dropdown-connector-123"]').simulate('click');
      wrapper.update();
      wrapper.find('input[id="close-by-user"]').simulate('change');
      wrapper.update();

      expect(
        wrapper.find('[data-test-subj="case-configure-action-bottom-bar"]').exists()
      ).toBeFalsy();
    });

    test('it close and restores the action bar when the add connector button is pressed', () => {
      useCaseConfigureMock
        .mockImplementationOnce(() => ({
          ...useCaseConfigureResponse,
          mapping,
          closureType: 'close-by-user',
          connectorId: '456',
          currentConfiguration: { connectorId: '456', closureType: 'close-by-user' },
        }))
        .mockImplementation(() => ({
          ...useCaseConfigureResponse,
          mapping,
          closureType: 'close-by-pushing',
          connectorId: '456',
          currentConfiguration: { connectorId: '456', closureType: 'close-by-user' },
        }));
      const wrapper = mount(<ConfigureCases userCanCrud />, { wrappingComponent: TestProviders });
      // Change closure type
      wrapper.find('input[id="close-by-pushing"]').simulate('change');
      wrapper.update();

      expect(
        wrapper.find('[data-test-subj="case-configure-action-bottom-bar"]').exists()
      ).toBeTruthy();

      // Press add connector button
      wrapper
        .find('button[data-test-subj="case-configure-add-connector-button"]')
        .simulate('click');
      wrapper.update();

      expect(
        wrapper.find('[data-test-subj="case-configure-action-bottom-bar"]').exists()
      ).toBeFalsy();

      expect(wrapper.find(ConnectorAddFlyout).prop('addFlyoutVisible')).toBe(true);

      // Close the add flyout
      wrapper.find('button[data-test-subj="euiFlyoutCloseButton"]').simulate('click');
      wrapper.update();

      expect(
        wrapper.find('[data-test-subj="case-configure-action-bottom-bar"]').exists()
      ).toBeTruthy();

      expect(wrapper.find(ConnectorAddFlyout).prop('addFlyoutVisible')).toBe(false);

      expect(
        wrapper
          .find('[data-test-subj="case-configure-action-bottom-bar-total-changes"]')
          .first()
          .text()
      ).toBe('1 unsaved changes');
    });

    test('it close and restores the action bar when the update connector button is pressed', () => {
      useCaseConfigureMock
        .mockImplementationOnce(() => ({
          ...useCaseConfigureResponse,
          mapping,
          closureType: 'close-by-user',
          connectorId: '456',
          currentConfiguration: { connectorId: '456', closureType: 'close-by-user' },
        }))
        .mockImplementation(() => ({
          ...useCaseConfigureResponse,
          mapping,
          closureType: 'close-by-pushing',
          connectorId: '456',
          currentConfiguration: { connectorId: '456', closureType: 'close-by-user' },
        }));
      const wrapper = mount(<ConfigureCases userCanCrud />, { wrappingComponent: TestProviders });

      // Change closure type
      wrapper.find('input[id="close-by-pushing"]').simulate('change');
      wrapper.update();

      // Press update connector button
      wrapper
        .find('button[data-test-subj="case-mapping-update-connector-button"]')
        .simulate('click');
      wrapper.update();

      expect(
        wrapper.find('[data-test-subj="case-configure-action-bottom-bar"]').exists()
      ).toBeFalsy();

      expect(wrapper.find(ConnectorEditFlyout).prop('editFlyoutVisible')).toBe(true);

      // Close the edit flyout
      wrapper.find('button[data-test-subj="euiFlyoutCloseButton"]').simulate('click');
      wrapper.update();

      expect(
        wrapper.find('[data-test-subj="case-configure-action-bottom-bar"]').exists()
      ).toBeTruthy();

      expect(wrapper.find(ConnectorEditFlyout).prop('editFlyoutVisible')).toBe(false);

      expect(
        wrapper
          .find('[data-test-subj="case-configure-action-bottom-bar-total-changes"]')
          .first()
          .text()
      ).toBe('1 unsaved changes');
    });

    test('it shows the action bar when the connector is changed', () => {
      useCaseConfigureMock
        .mockImplementationOnce(() => ({
          ...useCaseConfigureResponse,
          mapping,
          closureType: 'close-by-user',
          connectorId: '123',
          currentConfiguration: { connectorId: '123', closureType: 'close-by-user' },
        }))
        .mockImplementation(() => ({
          ...useCaseConfigureResponse,
          mapping,
          closureType: 'close-by-user',
          connectorId: '456',
          currentConfiguration: { connectorId: '123', closureType: 'close-by-user' },
        }));
      const wrapper = mount(<ConfigureCases userCanCrud />, { wrappingComponent: TestProviders });
      wrapper.find('button[data-test-subj="dropdown-connectors"]').simulate('click');
      wrapper.update();
      wrapper.find('button[data-test-subj="dropdown-connector-456"]').simulate('click');
      wrapper.update();

      expect(
        wrapper.find('[data-test-subj="case-configure-action-bottom-bar"]').exists()
      ).toBeTruthy();
      expect(
        wrapper
          .find('[data-test-subj="case-configure-action-bottom-bar-total-changes"]')
          .first()
          .text()
      ).toBe('1 unsaved changes');
    });

    test('it closes the action bar when pressing save', () => {
      useCaseConfigureMock
        .mockImplementationOnce(() => ({
          ...useCaseConfigureResponse,
          mapping,
          closureType: 'close-by-user',
          connectorId: '456',
          currentConfiguration: { connectorId: '456', closureType: 'close-by-user' },
        }))
        .mockImplementation(() => ({
          ...useCaseConfigureResponse,
          mapping,
          closureType: 'close-by-pushing',
          connectorId: '456',
          currentConfiguration: { connectorId: '456', closureType: 'close-by-user' },
        }));
      const wrapper = mount(<ConfigureCases userCanCrud />, { wrappingComponent: TestProviders });
      wrapper.find('input[id="close-by-pushing"]').simulate('change');
      wrapper.update();

      expect(
        wrapper.find('[data-test-subj="case-configure-action-bottom-bar"]').exists()
      ).toBeTruthy();

      wrapper
        .find('[data-test-subj="case-configure-action-bottom-bar-save-button"]')
        .first()
        .simulate('click');

      wrapper.update();

      expect(
        wrapper.find('[data-test-subj="case-configure-action-bottom-bar"]').exists()
      ).toBeFalsy();
    });
  });
});
