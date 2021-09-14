/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';
import { act } from 'react-dom/test-utils';

import { AllCasesGeneric } from './all_cases_generic';
import { TestProviders } from '../../common/mock';
import { useGetTags } from '../../containers/use_get_tags';
import { useGetReporters } from '../../containers/use_get_reporters';
import { useGetActionLicense } from '../../containers/use_get_action_license';
import { useConnectors } from '../../containers/configure/use_connectors';
import { useKibana } from '../../common/lib/kibana';
import { StatusAll } from '../../containers/types';
import { CaseStatuses, SECURITY_SOLUTION_OWNER } from '../../../common';
import { connectorsMock } from '../../containers/mock';
import { actionTypeRegistryMock } from '../../../../triggers_actions_ui/public/application/action_type_registry.mock';
import { triggersActionsUiMock } from '../../../../triggers_actions_ui/public/mocks';

jest.mock('../../containers/use_get_reporters');
jest.mock('../../containers/use_get_tags');
jest.mock('../../containers/use_get_action_license');
jest.mock('../../containers/configure/use_connectors');
jest.mock('../../containers/api');
jest.mock('../../common/lib/kibana');

const createCaseNavigation = { href: '', onClick: jest.fn() };

const alertDataMock = {
  type: 'alert',
  rule: {
    id: 'rule-id',
    name: 'rule',
  },
  index: 'index-id',
  alertId: 'alert-id',
  owner: SECURITY_SOLUTION_OWNER,
};

const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;
const useConnectorsMock = useConnectors as jest.Mock;
const mockTriggersActionsUiService = triggersActionsUiMock.createStart();

jest.mock('../../common/lib/kibana', () => {
  const originalModule = jest.requireActual('../../common/lib/kibana');
  return {
    ...originalModule,
    useKibana: () => ({
      services: {
        triggersActionsUi: mockTriggersActionsUiService,
      },
    }),
  };
});

describe('AllCasesGeneric ', () => {
  const { createMockActionTypeModel } = actionTypeRegistryMock;

  beforeAll(() => {
    connectorsMock.forEach((connector) =>
      useKibanaMock().services.triggersActionsUi.actionTypeRegistry.register(
        createMockActionTypeModel({ id: connector.actionTypeId, iconClass: 'logoSecurity' })
      )
    );
  });

  beforeEach(() => {
    jest.resetAllMocks();
    (useGetTags as jest.Mock).mockReturnValue({ tags: ['coke', 'pepsi'], fetchTags: jest.fn() });
    (useGetReporters as jest.Mock).mockReturnValue({
      reporters: ['casetester'],
      respReporters: [{ username: 'casetester' }],
      isLoading: true,
      isError: false,
      fetchReporters: jest.fn(),
    });
    (useGetActionLicense as jest.Mock).mockReturnValue({
      actionLicense: null,
      isLoading: false,
    });
    useConnectorsMock.mockImplementation(() => ({ connectors: connectorsMock, loading: false }));
  });

  it('renders the first available status when hiddenStatus is given', () =>
    act(async () => {
      const wrapper = mount(
        <TestProviders>
          <AllCasesGeneric
            alertData={alertDataMock}
            createCaseNavigation={createCaseNavigation}
            hiddenStatuses={[StatusAll, CaseStatuses.open]}
            isSelectorView={true}
            userCanCrud={true}
          />
        </TestProviders>
      );

      expect(wrapper.find(`[data-test-subj="status-badge-in-progress"]`).exists()).toBeTruthy();
    }));
});
