/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
// eslint-disable-next-line @kbn/eslint/module_migration
import { ThemeProvider } from 'styled-components';
import { mountWithIntl, nextTick } from '@kbn/test-jest-helpers';
import ActionsConnectorsList from './actions_connectors_list';
import { coreMock } from '@kbn/core/public/mocks';
import { ReactWrapper } from 'enzyme';
import { act } from 'react-dom/test-utils';
import { actionTypeRegistryMock } from '../../../action_type_registry.mock';
import { useKibana } from '../../../../common/lib/kibana';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { ActionConnector, EditConnectorTabs, GenericValidationResult } from '../../../../types';
import { times } from 'lodash';
import { useHistory, useParams } from 'react-router-dom';

jest.mock('../../../../common/lib/kibana');

jest.mock('../../../lib/action_connector_api', () => ({
  loadAllActions: jest.fn(),
  loadActionTypes: jest.fn(),
}));
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: jest.fn().mockReturnValue({}),
  useLocation: jest.fn().mockReturnValue({ search: '' }),
  useHistory: jest.fn().mockReturnValue({ push: jest.fn(), createHref: jest.fn() }),
}));

const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;
const actionTypeRegistry = actionTypeRegistryMock.create();
const mocks = coreMock.createSetup();
const { loadActionTypes } = jest.requireMock('../../../lib/action_connector_api');

describe('actions_connectors_list', () => {
  describe('component empty', () => {
    const setup = async () => {
      loadActionTypes.mockResolvedValueOnce([
        {
          id: 'test',
          name: 'Test',
          supportedFeatureIds: ['alerting'],
        },
        {
          id: 'test2',
          name: 'Test2',
          supportedFeatureIds: ['alerting'],
        },
      ]);
      actionTypeRegistry.has.mockReturnValue(true);

      const [
        {
          application: { capabilities },
        },
      ] = await mocks.getStartServices();

      // eslint-disable-next-line react-hooks/rules-of-hooks
      useKibanaMock().services.actionTypeRegistry = actionTypeRegistry;
      // eslint-disable-next-line react-hooks/rules-of-hooks
      useKibanaMock().services.application.capabilities = {
        ...capabilities,
        actions: {
          delete: true,
          save: true,
          show: true,
        },
      };
    };

    it('renders empty prompt', async () => {
      await setup();
      render(
        <IntlProvider>
          <ActionsConnectorsList
            setAddFlyoutVisibility={() => {}}
            loadActions={async () => {}}
            editItem={() => {}}
            isLoadingActions={false}
            actions={[]}
            setActions={() => {}}
          />
        </IntlProvider>
      );

      expect(await screen.findByTestId('createFirstConnectorEmptyPrompt')).toBeInTheDocument();
      expect(await screen.findByTestId('createFirstActionButton')).toBeInTheDocument();
    });

    test('if click create button should render CreateConnectorFlyout', async () => {
      await setup();
      const setAddFlyoutVisibility = jest.fn();
      render(
        <IntlProvider>
          <ActionsConnectorsList
            setAddFlyoutVisibility={setAddFlyoutVisibility}
            loadActions={async () => {}}
            editItem={() => {}}
            isLoadingActions={false}
            actions={[]}
            setActions={() => {}}
          />
        </IntlProvider>
      );
      const createFirstActionButton = await screen.findByTestId('createFirstActionButton');
      userEvent.click(createFirstActionButton);
      await waitFor(() => {
        expect(setAddFlyoutVisibility).toBeCalled();
      });
    });
  });

  describe('component with items', () => {
    let wrapper: ReactWrapper<any>;
    const mockedActions = [
      {
        id: '1',
        actionTypeId: 'test',
        isPreconfigured: false,
        isDeprecated: false,
        referencedByCount: 1,
        config: {},
      },
      {
        id: '2',
        actionTypeId: 'test2',
        description: 'My test 2',
        referencedByCount: 1,
        isPreconfigured: false,
        isDeprecated: false,
        config: {},
      },
      {
        id: '3',
        actionTypeId: 'test2',
        isMissingSecrets: true,
        referencedByCount: 1,
        isPreconfigured: true,
        isDeprecated: false,
        config: {},
      },
      {
        id: '4',
        actionTypeId: 'nonexistent',
        referencedByCount: 1,
        isPreconfigured: false,
        isDeprecated: false,
        config: {},
      },
      {
        id: '5',
        actionTypeId: 'test3',
        referencedByCount: 1,
        isPreconfigured: false,
        isDeprecated: false,
        config: {},
      },
      {
        id: '6',
        actionTypeId: 'test4',
        referencedByCount: 1,
        isPreconfigured: false,
        isDeprecated: false,
        config: {},
      },
    ] as ActionConnector[];
    let mockedEditItem: jest.Mock;

    afterEach(() => {
      mockedEditItem.mockReset();
    });

    afterAll(() => {
      jest.clearAllMocks();
    });

    async function setup(actionConnectors = mockedActions) {
      loadActionTypes.mockResolvedValueOnce([
        {
          id: 'test',
          name: 'Test',
          enabled: true,
          supportedFeatureIds: ['alerting'],
        },
        {
          id: 'test2',
          name: 'Test2',
          enabled: true,
          supportedFeatureIds: ['alerting', 'cases'],
        },
        {
          id: 'test3',
          name: 'Test3',
          enabled: true,
          supportedFeatureIds: ['alerting', 'cases', 'siem', 'uptime'],
        },
        {
          id: 'test4',
          name: 'Test4',
          enabled: true,
          supportedFeatureIds: ['cases'],
        },
      ]);

      const [
        {
          application: { capabilities },
        },
      ] = await mocks.getStartServices();

      const mockedActionParamsFields = React.lazy(async () => ({
        default() {
          return <></>;
        },
      }));

      actionTypeRegistry.get.mockReturnValue({
        id: 'test',
        iconClass: 'test',
        selectMessage: 'test',
        validateParams: (): Promise<GenericValidationResult<unknown>> => {
          const validationResult = { errors: {} };
          return Promise.resolve(validationResult);
        },
        actionConnectorFields: null,
        actionParamsFields: mockedActionParamsFields,
      });
      // eslint-disable-next-line react-hooks/rules-of-hooks
      useKibanaMock().services.actionTypeRegistry = actionTypeRegistry;
      // eslint-disable-next-line react-hooks/rules-of-hooks
      useKibanaMock().services.application.capabilities = {
        ...capabilities,
        actions: {
          delete: true,
          save: true,
          show: true,
        },
      };

      mockedEditItem = jest.fn();

      wrapper = mountWithIntl(
        <ActionsConnectorsList
          setAddFlyoutVisibility={() => {}}
          loadActions={async () => {}}
          editItem={mockedEditItem}
          isLoadingActions={false}
          actions={actionConnectors}
          setActions={() => {}}
        />
      );

      // Wait for active space to resolve before requesting the component to update
      await act(async () => {
        await nextTick();
        wrapper.update();
      });
    }

    it('renders table of connectors', async () => {
      await setup();
      expect(wrapper.find('EuiInMemoryTable')).toHaveLength(1);
      expect(wrapper.find('EuiTableRow')).toHaveLength(6);

      expect(
        wrapper
          .find('tr[data-test-subj="connectors-row"]')
          .at(0)
          .find('div[data-test-subj="compatibility-content"]')
          .text()
      ).toBe('Alerting Rules');

      expect(
        wrapper
          .find('tr[data-test-subj="connectors-row"]')
          .at(1)
          .find('div[data-test-subj="compatibility-content"]')
          .text()
      ).toBe('Alerting RulesCases');

      expect(
        wrapper
          .find('tr[data-test-subj="connectors-row"]')
          .at(2)
          .find('div[data-test-subj="compatibility-content"]')
          .text()
      ).toBe('Alerting RulesCases');

      expect(
        wrapper
          .find('tr[data-test-subj="connectors-row"]')
          .at(3)
          .find('div[data-test-subj="compatibility-content"]')
          .text()
      ).toBe('');

      expect(
        wrapper
          .find('tr[data-test-subj="connectors-row"]')
          .at(4)
          .find('div[data-test-subj="compatibility-content"]')
          .text()
      ).toBe('Alerting RulesCases');

      expect(
        wrapper
          .find('tr[data-test-subj="connectors-row"]')
          .at(5)
          .find('div[data-test-subj="compatibility-content"]')
          .text()
      ).toBe('Cases');
    });

    it('renders table with preconfigured connectors', async () => {
      await setup();
      expect(wrapper.find('span[data-test-subj="preConfiguredTitleMessage"]')).toHaveLength(1);
    });

    it('renders unknown connector type as disabled', async () => {
      await setup();
      expect(wrapper.find('button[data-test-subj="edit4"]').getDOMNode()).toBeDisabled();
      expect(
        wrapper.find('button[data-test-subj="deleteConnector"]').last().getDOMNode()
      ).not.toBeDisabled();
      expect(
        wrapper.find('button[data-test-subj="runConnector"]').last().getDOMNode()
      ).toBeDisabled();
    });

    it('renders fix button when connector secrets is missing', async () => {
      await setup();
      expect(
        wrapper.find('button[data-test-subj="deleteConnector"]').last().getDOMNode()
      ).not.toBeDisabled();
      expect(
        wrapper.find('button[data-test-subj="fixConnectorButton"]').last().getDOMNode()
      ).not.toBeDisabled();
    });

    it('supports pagination', async () => {
      await setup(
        times(15, (index) => ({
          id: `connector${index}`,
          actionTypeId: 'test',
          name: `My test ${index}`,
          secrets: {},
          isPreconfigured: false,
          isDeprecated: false,
          isSystemAction: false,
          referencedByCount: 1,
          config: {},
        }))
      );
      expect(wrapper.find('[data-test-subj="actionsTable"]').first().prop('pagination'))
        .toMatchInlineSnapshot(`
      Object {
        "initialPageIndex": 0,
        "pageIndex": 0,
      }
    `);
      wrapper.find('[data-test-subj="pagination-button-1"]').last().simulate('click');
      expect(wrapper.find('[data-test-subj="actionsTable"]').first().prop('pagination'))
        .toMatchInlineSnapshot(`
        Object {
          "initialPageIndex": 0,
          "pageIndex": 1,
        }
      `);
    });

    it('if delete item that is used in a rule should show a warning in the popup', async () => {
      await setup();
      await wrapper.find('.euiButtonIcon').last().simulate('click');
      expect(wrapper.find('[data-test-subj="deleteConnectorsConfirmation"]').exists()).toBeTruthy();
      expect(
        wrapper
          .find('[data-test-subj="deleteConnectorsConfirmation"]')
          .text()
          .includes('This connector is used in a rule')
      );
    });

    it('call editItem when connectorId presented in url', async () => {
      const selectedConnector = mockedActions[3];
      const mockedCreateHref = jest.fn(({ pathname }) => pathname);
      const replaceStateSpy = jest.spyOn(window.history, 'replaceState');
      (useParams as jest.Mock).mockReturnValue({ connectorId: selectedConnector.id });
      (useHistory as jest.Mock).mockReturnValue({ createHref: mockedCreateHref });

      await setup();

      expect(mockedEditItem).toBeCalledWith(selectedConnector, EditConnectorTabs.Configuration);
      expect(mockedCreateHref).toHaveBeenCalledWith({ pathname: '/connectors' });
      expect(replaceStateSpy).toHaveBeenCalledWith(null, '', '/connectors');
      replaceStateSpy.mockRestore();
    });
  });

  describe('check EditConnectorFlyout will open on edit connector', () => {
    let wrapper: ReactWrapper<any>;
    const mockedActions = [
      {
        id: '1',
        actionTypeId: 'test',
        isPreconfigured: false,
        isDeprecated: false,
        referencedByCount: 1,
        config: {},
      },
      {
        id: '2',
        actionTypeId: 'test2',
        description: 'My test 2',
        referencedByCount: 1,
        isPreconfigured: false,
        isDeprecated: false,
        config: {},
      },
      {
        id: '3',
        actionTypeId: 'test2',
        isMissingSecrets: true,
        referencedByCount: 1,
        isPreconfigured: true,
        isDeprecated: false,
        config: {},
      },
      {
        id: '4',
        actionTypeId: 'nonexistent',
        referencedByCount: 1,
        isPreconfigured: false,
        isDeprecated: false,
        config: {},
      },
      {
        id: '5',
        actionTypeId: 'test3',
        referencedByCount: 1,
        isPreconfigured: false,
        isDeprecated: false,
        config: {},
      },
      {
        id: '6',
        actionTypeId: 'test4',
        referencedByCount: 1,
        isPreconfigured: false,
        isDeprecated: false,
        config: {},
      },
    ] as ActionConnector[];

    async function setup() {
      loadActionTypes.mockResolvedValueOnce([
        {
          id: 'test',
          name: 'Test',
          enabled: true,
          supportedFeatureIds: ['alerting'],
        },
        {
          id: 'test2',
          name: 'Test2',
          enabled: true,
          supportedFeatureIds: ['alerting', 'cases'],
        },
        {
          id: 'test3',
          name: 'Test3',
          enabled: true,
          supportedFeatureIds: ['alerting', 'cases', 'siem', 'uptime'],
        },
        {
          id: 'test4',
          name: 'Test4',
          enabled: true,
          supportedFeatureIds: ['cases'],
        },
      ]);

      const [
        {
          application: { capabilities },
        },
      ] = await mocks.getStartServices();

      const mockedActionParamsFields = React.lazy(async () => ({
        default() {
          return <></>;
        },
      }));

      actionTypeRegistry.get.mockReturnValue({
        id: 'test',
        iconClass: 'test',
        selectMessage: 'test',
        validateParams: (): Promise<GenericValidationResult<unknown>> => {
          const validationResult = { errors: {} };
          return Promise.resolve(validationResult);
        },
        actionConnectorFields: null,
        actionParamsFields: mockedActionParamsFields,
      });
      // eslint-disable-next-line react-hooks/rules-of-hooks
      useKibanaMock().services.actionTypeRegistry = actionTypeRegistry;
      // eslint-disable-next-line react-hooks/rules-of-hooks
      useKibanaMock().services.application.capabilities = {
        ...capabilities,
        actions: {
          delete: true,
          save: true,
          show: true,
        },
      };
    }

    it('if select item for edit should render EditConnectorFlyout', async () => {
      await setup();
      const editItem = jest.fn();

      wrapper = mountWithIntl(
        <ActionsConnectorsList
          setAddFlyoutVisibility={() => {}}
          loadActions={async () => {}}
          editItem={editItem}
          isLoadingActions={false}
          actions={mockedActions}
          setActions={() => {}}
        />
      );

      // Wait for active space to resolve before requesting the component to update
      await act(async () => {
        await nextTick();
        wrapper.update();
      });
      wrapper.find('[data-test-subj="edit1"]').first().find('button').simulate('click');
      expect(editItem).toBeCalled();
    });
  });
  describe('component empty with show only capability', () => {
    let wrapper: ReactWrapper<any>;

    async function setup() {
      loadActionTypes.mockResolvedValueOnce([
        {
          id: 'test',
          name: 'Test',
          supportedFeatureIds: ['alerting'],
        },
        {
          id: 'test2',
          name: 'Test2',
          supportedFeatureIds: ['alerting'],
        },
      ]);
      const [
        {
          application: { capabilities },
        },
      ] = await mocks.getStartServices();

      // eslint-disable-next-line react-hooks/rules-of-hooks
      useKibanaMock().services.actionTypeRegistry = actionTypeRegistry;
      // eslint-disable-next-line react-hooks/rules-of-hooks
      useKibanaMock().services.application.capabilities = {
        ...capabilities,
        actions: {
          show: true,
          save: false,
          delete: false,
        },
      };

      wrapper = mountWithIntl(
        <ActionsConnectorsList
          setAddFlyoutVisibility={() => {}}
          loadActions={async () => {}}
          editItem={() => {}}
          isLoadingActions={false}
          actions={[]}
          setActions={() => {}}
        />
      );

      // Wait for active space to resolve before requesting the component to update
      await act(async () => {
        await nextTick();
        wrapper.update();
      });
    }

    it('renders no permissions to create connector', async () => {
      await setup();
      expect(wrapper.find('[defaultMessage="No permissions to create connectors"]')).toHaveLength(
        1
      );
      expect(wrapper.find('[data-test-subj="createConnectorButton"]')).toHaveLength(0);
    });
  });

  describe('with show only capability', () => {
    let wrapper: ReactWrapper<any>;

    async function setup() {
      loadActionTypes.mockResolvedValueOnce([
        {
          id: 'test',
          name: 'Test',
          supportedFeatureIds: ['alerting'],
        },
        {
          id: 'test2',
          name: 'Test2',
          supportedFeatureIds: ['alerting'],
        },
      ]);
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
          save: false,
          delete: false,
        },
      };
      // eslint-disable-next-line react-hooks/rules-of-hooks
      useKibanaMock().services.actionTypeRegistry = actionTypeRegistry;
      wrapper = mountWithIntl(
        <ActionsConnectorsList
          setAddFlyoutVisibility={() => {}}
          loadActions={async () => {}}
          editItem={() => {}}
          isLoadingActions={false}
          actions={
            [
              {
                id: '1',
                actionTypeId: 'test',
                isPreconfigured: false,
                isDeprecated: false,
                referencedByCount: 1,
                config: {},
              },
              {
                id: '2',
                actionTypeId: 'test2',
                referencedByCount: 1,
                isPreconfigured: false,
                isDeprecated: false,
                config: {},
              },
            ] as ActionConnector[]
          }
          setActions={() => {}}
        />
      );

      // Wait for active space to resolve before requesting the component to update
      await act(async () => {
        await nextTick();
        wrapper.update();
      });
    }

    it('renders table of connectors with delete button disabled', async () => {
      await setup();
      expect(wrapper.find('EuiInMemoryTable')).toHaveLength(1);
      expect(wrapper.find('EuiTableRow')).toHaveLength(2);
      wrapper.find('EuiTableRow').forEach((elem) => {
        const deleteButton = elem.find('[data-test-subj="deleteConnector"]').first();
        expect(deleteButton).toBeTruthy();
        expect(deleteButton.prop('isDisabled')).toBeTruthy();
      });
    });
  });

  describe('component with disabled items', () => {
    let wrapper: ReactWrapper<any>;

    async function setup() {
      loadActionTypes.mockResolvedValueOnce([
        {
          id: 'test',
          name: 'Test',
          enabled: false,
          enabledInConfig: false,
          enabledInLicense: true,
          supportedFeatureIds: ['alerting'],
        },
        {
          id: 'test2',
          name: 'Test2',
          enabled: false,
          enabledInConfig: true,
          enabledInLicense: false,
          supportedFeatureIds: ['alerting'],
        },
      ]);

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
      // eslint-disable-next-line react-hooks/rules-of-hooks
      useKibanaMock().services.actionTypeRegistry = actionTypeRegistry;
      wrapper = mountWithIntl(
        <ActionsConnectorsList
          setAddFlyoutVisibility={() => {}}
          loadActions={async () => {}}
          editItem={() => {}}
          isLoadingActions={false}
          actions={
            [
              {
                id: '1',
                actionTypeId: 'test',
                referencedByCount: 1,
                config: {},
              },
              {
                id: '2',
                actionTypeId: 'test2',
                referencedByCount: 1,
                config: {},
              },
            ] as ActionConnector[]
          }
          setActions={() => {}}
        />
      );

      // Wait for active space to resolve before requesting the component to update
      await act(async () => {
        await nextTick();
        wrapper.update();
      });
    }

    it('renders table of connectors', async () => {
      await setup();
      expect(wrapper.find('EuiInMemoryTable')).toHaveLength(1);
      expect(wrapper.find('EuiTableRow')).toHaveLength(2);
      expect(wrapper.find('EuiTableRow').at(0).prop('className')).toEqual(
        'actConnectorsList__tableRowDisabled'
      );
      expect(wrapper.find('EuiTableRow').at(1).prop('className')).toEqual(
        'actConnectorsList__tableRowDisabled'
      );
    });
  });

  describe('component with deprecated connectors', () => {
    let wrapper: ReactWrapper<any>;

    async function setup() {
      loadActionTypes.mockResolvedValueOnce([
        {
          id: 'test',
          name: '.servicenow',
          enabled: false,
          enabledInConfig: false,
          enabledInLicense: true,
          supportedFeatureIds: ['alerting'],
        },
        {
          id: 'test2',
          name: '.servicenow-sir',
          enabled: false,
          enabledInConfig: true,
          enabledInLicense: false,
          supportedFeatureIds: ['alerting'],
        },
      ]);

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
      // eslint-disable-next-line react-hooks/rules-of-hooks
      useKibanaMock().services.actionTypeRegistry = actionTypeRegistry;
      wrapper = mountWithIntl(
        <ThemeProvider theme={() => ({ eui: { euiSizeS: '15px' }, darkMode: true })}>
          <ActionsConnectorsList
            setAddFlyoutVisibility={() => {}}
            loadActions={async () => {}}
            editItem={() => {}}
            isLoadingActions={false}
            actions={
              [
                {
                  id: '1',
                  actionTypeId: '.servicenow',
                  referencedByCount: 1,
                  config: { usesTableApi: true },
                  isDeprecated: true,
                },
                {
                  id: '2',
                  actionTypeId: '.servicenow-sir',
                  referencedByCount: 1,
                  config: { usesTableApi: true },
                  isDeprecated: true,
                },
              ] as Array<ActionConnector<{ usesTableApi: boolean }>>
            }
            setActions={() => {}}
          />
        </ThemeProvider>
      );

      // Wait for active space to resolve before requesting the component to update
      await act(async () => {
        await nextTick();
        wrapper.update();
      });
    }

    it('shows the warning icon', async () => {
      await setup();
      expect(wrapper.find('EuiInMemoryTable')).toHaveLength(1);
      expect(wrapper.find('EuiTableRow')).toHaveLength(2);
      expect(wrapper.find('.euiToolTipAnchor [aria-label="Warning"]').exists()).toBe(true);
    });
  });
});
