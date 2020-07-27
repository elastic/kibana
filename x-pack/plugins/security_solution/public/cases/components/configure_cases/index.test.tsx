/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { ReactWrapper, mount } from 'enzyme';

import { ConfigureCases } from '.';
import { TestProviders } from '../../../common/mock';
import { Connectors } from './connectors';
import { ClosureOptions } from './closure_options';
import {
  ActionsConnectorsContextProvider,
  ConnectorAddFlyout,
  ConnectorEditFlyout,
} from '../../../../../triggers_actions_ui/public';

import { useKibana } from '../../../common/lib/kibana';
import { useConnectors } from '../../containers/configure/use_connectors';
import { useCaseConfigure } from '../../containers/configure/use_configure';
import { useGetUrlSearch } from '../../../common/components/navigation/use_get_url_search';

import {
  connectors,
  searchURL,
  useCaseConfigureResponse,
  useConnectorsResponse,
  kibanaMockImplementationArgs,
} from './__mock__';

jest.mock('../../../common/lib/kibana');
jest.mock('../../containers/configure/use_connectors');
jest.mock('../../containers/configure/use_configure');
jest.mock('../../../common/components/navigation/use_get_url_search');

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
      expect(wrapper.find('[data-test-subj="dropdown-connectors"]').exists()).toBeTruthy();
    });

    test('it renders the ClosureType', () => {
      expect(wrapper.find('[data-test-subj="closure-options-radio-group"]').exists()).toBeTruthy();
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
      jest.resetAllMocks();
      useCaseConfigureMock.mockImplementation(() => ({
        ...useCaseConfigureResponse,
        mapping: connectors[0].config.incidentConfiguration.mapping,
        closureType: 'close-by-user',
        connectorId: 'servicenow-1',
        connectorName: 'unchanged',
        currentConfiguration: {
          connectorName: 'unchanged',
          connectorId: 'servicenow-1',
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
      expect(wrapper.find(Connectors).prop('selectedConnector')).toBe('servicenow-1');

      // ClosureOptions
      expect(wrapper.find(ClosureOptions).prop('disabled')).toBe(false);
      expect(wrapper.find(ClosureOptions).prop('closureTypeSelected')).toBe('close-by-user');

      // Flyouts
      expect(wrapper.find(ConnectorAddFlyout).prop('addFlyoutVisible')).toBe(false);
      expect(wrapper.find(ConnectorAddFlyout).prop('actionTypes')).toEqual([
        expect.objectContaining({
          id: '.servicenow',
        }),
        expect.objectContaining({
          id: '.jira',
        }),
        expect.objectContaining({
          id: '.resilient',
        }),
      ]);

      expect(wrapper.find(ConnectorEditFlyout).prop('editFlyoutVisible')).toBe(false);
      expect(wrapper.find(ConnectorEditFlyout).prop('initialConnector')).toEqual(connectors[0]);
    });

    test('it disables correctly when the user cannot crud', () => {
      const newWrapper = mount(<ConfigureCases userCanCrud={false} />, {
        wrappingComponent: TestProviders,
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
      jest.resetAllMocks();
      jest.restoreAllMocks();
      jest.clearAllMocks();
      useCaseConfigureMock.mockImplementation(() => ({
        ...useCaseConfigureResponse,
        mapping: connectors[1].config.incidentConfiguration.mapping,
        closureType: 'close-by-user',
        connectorId: 'servicenow-2',
        connectorName: 'unchanged',
        currentConfiguration: {
          connectorName: 'unchanged',
          connectorId: 'servicenow-1',
          closureType: 'close-by-user',
        },
      }));
      useConnectorsMock.mockImplementation(() => ({
        ...useConnectorsResponse,
        loading: true,
      }));
      useKibanaMock.mockImplementation(() => kibanaMockImplementationArgs);
      useGetUrlSearchMock.mockImplementation(() => searchURL);
      wrapper = mount(<ConfigureCases userCanCrud />, { wrappingComponent: TestProviders });
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
  });

  describe('saving configuration', () => {
    let wrapper: ReactWrapper;

    beforeEach(() => {
      jest.resetAllMocks();
      useCaseConfigureMock.mockImplementation(() => ({
        ...useCaseConfigureResponse,
        connectorId: 'servicenow-1',
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
      jest.resetAllMocks();
      useCaseConfigureMock.mockImplementation(() => ({
        ...useCaseConfigureResponse,
        loading: true,
      }));
      useConnectorsMock.mockImplementation(() => ({
        ...useConnectorsResponse,
      }));
      useKibanaMock.mockImplementation(() => kibanaMockImplementationArgs);
      useGetUrlSearchMock.mockImplementation(() => searchURL);
      wrapper = mount(<ConfigureCases userCanCrud />, { wrappingComponent: TestProviders });
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
    let wrapper: ReactWrapper;
    const persistCaseConfigure = jest.fn();

    beforeEach(() => {
      jest.resetAllMocks();
      useCaseConfigureMock.mockImplementation(() => ({
        ...useCaseConfigureResponse,
        mapping: connectors[0].config.incidentConfiguration.mapping,
        closureType: 'close-by-user',
        connectorId: 'servicenow-1',
        connectorName: 'My connector',
        currentConfiguration: {
          connectorName: 'My connector',
          connectorId: 'My connector',
          closureType: 'close-by-user',
        },
        persistCaseConfigure,
      }));
      useConnectorsMock.mockImplementation(() => useConnectorsResponse);
      useKibanaMock.mockImplementation(() => kibanaMockImplementationArgs);
      useGetUrlSearchMock.mockImplementation(() => searchURL);

      wrapper = mount(<ConfigureCases userCanCrud />, { wrappingComponent: TestProviders });
    });

    test('it submits the configuration correctly when changing connector', () => {
      wrapper.find('button[data-test-subj="dropdown-connectors"]').simulate('click');
      wrapper.update();
      wrapper.find('button[data-test-subj="dropdown-connector-servicenow-2"]').simulate('click');
      wrapper.update();

      expect(persistCaseConfigure).toHaveBeenCalled();
      expect(persistCaseConfigure).toHaveBeenCalledWith({
        connectorId: 'servicenow-2',
        connectorName: 'My Connector 2',
        closureType: 'close-by-user',
      });
    });

    test('the text of the update button is changed successfully', () => {
      useCaseConfigureMock
        .mockImplementationOnce(() => ({
          ...useCaseConfigureResponse,
          connectorId: 'servicenow-1',
        }))
        .mockImplementation(() => ({
          ...useCaseConfigureResponse,
          connectorId: 'servicenow-2',
        }));

      wrapper = mount(<ConfigureCases userCanCrud />, { wrappingComponent: TestProviders });

      wrapper.find('button[data-test-subj="dropdown-connectors"]').simulate('click');
      wrapper.update();
      wrapper.find('button[data-test-subj="dropdown-connector-servicenow-2"]').simulate('click');
      wrapper.update();

      expect(
        wrapper
          .find('button[data-test-subj="case-configure-update-selected-connector-button"]')
          .text()
      ).toBe('Update My Connector 2');
    });
  });
});

describe('closure options', () => {
  let wrapper: ReactWrapper;
  const persistCaseConfigure = jest.fn();

  beforeEach(() => {
    jest.resetAllMocks();
    useCaseConfigureMock.mockImplementation(() => ({
      ...useCaseConfigureResponse,
      mapping: connectors[0].config.incidentConfiguration.mapping,
      closureType: 'close-by-user',
      connectorId: 'servicenow-1',
      connectorName: 'My connector',
      currentConfiguration: {
        connectorName: 'My connector',
        connectorId: 'My connector',
        closureType: 'close-by-user',
      },
      persistCaseConfigure,
    }));
    useConnectorsMock.mockImplementation(() => useConnectorsResponse);
    useKibanaMock.mockImplementation(() => kibanaMockImplementationArgs);
    useGetUrlSearchMock.mockImplementation(() => searchURL);

    wrapper = mount(<ConfigureCases userCanCrud />, { wrappingComponent: TestProviders });
  });

  test('it submits the configuration correctly when changing closure type', () => {
    wrapper.find('input[id="close-by-pushing"]').simulate('change');
    wrapper.update();

    expect(persistCaseConfigure).toHaveBeenCalled();
    expect(persistCaseConfigure).toHaveBeenCalledWith({
      connectorId: 'servicenow-1',
      connectorName: 'My Connector',
      closureType: 'close-by-pushing',
    });
  });
});

describe('user interactions', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    useCaseConfigureMock.mockImplementation(() => ({
      ...useCaseConfigureResponse,
      mapping: connectors[1].config.incidentConfiguration.mapping,
      closureType: 'close-by-user',
      connectorId: 'servicenow-2',
      connectorName: 'unchanged',
      currentConfiguration: {
        connectorName: 'unchanged',
        connectorId: 'servicenow-2',
        closureType: 'close-by-user',
      },
    }));
    useConnectorsMock.mockImplementation(() => useConnectorsResponse);
    useKibanaMock.mockImplementation(() => kibanaMockImplementationArgs);
    useGetUrlSearchMock.mockImplementation(() => searchURL);
  });

  test('it show the add flyout when pressing the add connector button', () => {
    const wrapper = mount(<ConfigureCases userCanCrud />, { wrappingComponent: TestProviders });
    wrapper.find('button[data-test-subj="dropdown-connectors"]').simulate('click');
    wrapper.update();
    wrapper.find('button[data-test-subj="dropdown-connector-add-connector"]').simulate('click');
    wrapper.update();

    expect(wrapper.find(ConnectorAddFlyout).prop('addFlyoutVisible')).toBe(true);
  });

  test('it show the edit flyout when pressing the update connector button', () => {
    const wrapper = mount(<ConfigureCases userCanCrud />, { wrappingComponent: TestProviders });
    wrapper
      .find('button[data-test-subj="case-configure-update-selected-connector-button"]')
      .simulate('click');
    wrapper.update();

    expect(wrapper.find(ConnectorEditFlyout).prop('editFlyoutVisible')).toBe(true);
    expect(
      wrapper.find('[data-test-subj="case-configure-action-bottom-bar"]').exists()
    ).toBeFalsy();
  });
});
