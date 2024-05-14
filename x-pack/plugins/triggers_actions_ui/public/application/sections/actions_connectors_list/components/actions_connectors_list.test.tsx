/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';
// eslint-disable-next-line @kbn/eslint/module_migration
import { ThemeProvider } from 'styled-components';
import { mountWithIntl, nextTick } from '@kbn/test-jest-helpers';

import ActionsConnectorsList from './actions_connectors_list';
import { coreMock } from '@kbn/core/public/mocks';
import { ReactWrapper } from 'enzyme';
import { act } from 'react-dom/test-utils';
import { actionTypeRegistryMock } from '../../../action_type_registry.mock';
import { useKibana } from '../../../../common/lib/kibana';

jest.mock('../../../../common/lib/kibana');
import { ActionConnector, GenericValidationResult } from '../../../../types';
import { times } from 'lodash';

jest.mock('../../../lib/action_connector_api', () => ({
  loadAllActions: jest.fn(),
  loadActionTypes: jest.fn(),
}));
const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;
const actionTypeRegistry = actionTypeRegistryMock.create();
const mocks = coreMock.createSetup();
const { loadAllActions, loadActionTypes } = jest.requireMock('../../../lib/action_connector_api');
const mockGetParams = jest.fn().mockReturnValue({});
const mockGetLocation = jest.fn().mockReturnValue({ search: '' });
const mockGetHistory = jest.fn().mockReturnValue({ push: jest.fn(), createHref: jest.fn() });

jest.mock('react-router-dom', () => ({
  useParams: () => mockGetParams(),
  useLocation: () => mockGetLocation(),
  useHistory: () => mockGetHistory(),
}));

describe('actions_connectors_list', () => {
  describe('component empty', () => {
    let wrapper: ReactWrapper<any>;

    async function setup() {
      loadAllActions.mockResolvedValueOnce([]);
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
      wrapper = mountWithIntl(<ActionsConnectorsList />);

      // Wait for active space to resolve before requesting the component to update
      await act(async () => {
        await nextTick();
        wrapper.update();
      });
    }

    it('renders empty prompt', async () => {
      await setup();
      expect(
        wrapper.find('[data-test-subj="createFirstConnectorEmptyPrompt"]').find('EuiEmptyPrompt')
      ).toHaveLength(1);
      expect(
        wrapper.find('[data-test-subj="createFirstActionButton"]').find('EuiButton')
      ).toHaveLength(1);
    });

    test('if click create button should render CreateConnectorFlyout', async () => {
      await setup();
      wrapper.find('[data-test-subj="createFirstActionButton"]').last().simulate('click');
      expect(wrapper.find('[data-test-subj="create-connector-flyout"]').exists()).toBeTruthy();
    });
  });

  describe('component with items', () => {
    let wrapper: ReactWrapper<any>;

    async function setup(actionConnectors?: ActionConnector[]) {
      loadAllActions.mockResolvedValueOnce(
        actionConnectors ?? [
          {
            id: '1',
            actionTypeId: 'test',
            description: 'My test',
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
            description: 'My preconfigured test 2',
            isMissingSecrets: true,
            referencedByCount: 1,
            isPreconfigured: true,
            isDeprecated: false,
            config: {},
          },
          {
            id: '4',
            actionTypeId: 'nonexistent',
            description: 'My invalid connector type',
            referencedByCount: 1,
            isPreconfigured: false,
            isDeprecated: false,
            config: {},
          },
          {
            id: '5',
            actionTypeId: 'test3',
            description: 'action with all feature ids',
            referencedByCount: 1,
            isPreconfigured: false,
            isDeprecated: false,
            config: {},
          },
          {
            id: '6',
            actionTypeId: 'test4',
            description: 'only cases',
            referencedByCount: 1,
            isPreconfigured: false,
            isDeprecated: false,
            config: {},
          },
        ]
      );
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
      wrapper = mountWithIntl(<ActionsConnectorsList />);

      // Wait for active space to resolve before requesting the component to update
      await act(async () => {
        await nextTick();
        wrapper.update();
      });

      expect(loadAllActions).toHaveBeenCalled();
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
          description: `My test ${index}`,
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

    test('if select item for edit should render EditConnectorFlyout', async () => {
      await setup();
      await wrapper.find('[data-test-subj="edit1"]').first().find('button').simulate('click');
      expect(wrapper.find('[data-test-subj="edit-connector-flyout"]').exists()).toBeTruthy();
    });

    test('if delete item that is used in a rule should show a warning in the popup', async () => {
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
  });

  describe('component empty with show only capability', () => {
    let wrapper: ReactWrapper<any>;

    async function setup() {
      loadAllActions.mockResolvedValueOnce([]);
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
      wrapper = mountWithIntl(<ActionsConnectorsList />);

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
      expect(wrapper.find('[data-test-subj="createActionButton"]')).toHaveLength(0);
    });
  });

  describe('with show only capability', () => {
    let wrapper: ReactWrapper<any>;

    async function setup() {
      loadAllActions.mockResolvedValueOnce([
        {
          id: '1',
          actionTypeId: 'test',
          description: 'My test',
          referencedByCount: 1,
          config: {},
        },
        {
          id: '2',
          actionTypeId: 'test2',
          description: 'My test 2',
          referencedByCount: 1,
          config: {},
        },
      ]);
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
      wrapper = mountWithIntl(<ActionsConnectorsList />);

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
      loadAllActions.mockResolvedValueOnce([
        {
          id: '1',
          actionTypeId: 'test',
          description: 'My test',
          referencedByCount: 1,
          config: {},
        },
        {
          id: '2',
          actionTypeId: 'test2',
          description: 'My test 2',
          referencedByCount: 1,
          config: {},
        },
      ]);
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
      wrapper = mountWithIntl(<ActionsConnectorsList />);

      // Wait for active space to resolve before requesting the component to update
      await act(async () => {
        await nextTick();
        wrapper.update();
      });

      expect(loadAllActions).toHaveBeenCalled();
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
      loadAllActions.mockResolvedValueOnce([
        {
          id: '1',
          actionTypeId: '.servicenow',
          description: 'My test',
          referencedByCount: 1,
          config: { usesTableApi: true },
          isDeprecated: true,
        },
        {
          id: '2',
          actionTypeId: '.servicenow-sir',
          description: 'My test 2',
          referencedByCount: 1,
          config: { usesTableApi: true },
          isDeprecated: true,
        },
      ]);
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
          <ActionsConnectorsList />
        </ThemeProvider>
      );

      // Wait for active space to resolve before requesting the component to update
      await act(async () => {
        await nextTick();
        wrapper.update();
      });

      expect(loadAllActions).toHaveBeenCalled();
    }

    it('shows the warning icon', async () => {
      await setup();
      expect(wrapper.find('EuiInMemoryTable')).toHaveLength(1);
      expect(wrapper.find('EuiTableRow')).toHaveLength(2);
      expect(wrapper.find('.euiToolTipAnchor [aria-label="Warning"]').exists()).toBe(true);
    });
  });
});
