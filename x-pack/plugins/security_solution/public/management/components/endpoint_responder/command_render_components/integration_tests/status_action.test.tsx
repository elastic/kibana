/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { AppContextTestRender } from '../../../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../../../common/mock/endpoint';
import {
  ConsoleManagerTestComponent,
  getConsoleManagerMockRenderResultQueriesAndActions,
} from '../../../console/components/console_manager/mocks';
import React from 'react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { getEndpointConsoleCommands } from '../../lib/console_commands_definition';
import { enterConsoleCommand } from '../../../console/mocks';
import { getEndpointAuthzInitialState } from '../../../../../../common/endpoint/service/authz';
import type { EndpointCapabilities } from '../../../../../../common/endpoint/service/response_actions/constants';
import { ENDPOINT_CAPABILITIES } from '../../../../../../common/endpoint/service/response_actions/constants';
import { useGetEndpointPendingActionsSummary } from '../../../../hooks/response_actions/use_get_endpoint_pending_actions_summary';
import { useGetEndpointDetails } from '../../../../hooks';
import { EndpointActionGenerator } from '../../../../../../common/endpoint/data_generators/endpoint_action_generator';
import { EndpointMetadataGenerator } from '../../../../../../common/endpoint/data_generators/endpoint_metadata_generator';

jest.mock('../../../../hooks/response_actions/use_get_endpoint_pending_actions_summary');
jest.mock('../../../../hooks');

const useGetEndpointPendingActionsSummaryMock = useGetEndpointPendingActionsSummary as jest.Mock;
const useGetEndpointDetailsMock = useGetEndpointDetails as jest.Mock;

// TODO This tests need revisting, they are timing out after the
// upgrade to user-event v14 https://github.com/elastic/kibana/pull/189949
describe.skip('When using processes action from response actions console', () => {
  let user: UserEvent;
  let render: (
    capabilities?: EndpointCapabilities[]
  ) => Promise<ReturnType<AppContextTestRender['render']>>;
  let renderResult: ReturnType<AppContextTestRender['render']>;
  let consoleManagerMockAccess: ReturnType<
    typeof getConsoleManagerMockRenderResultQueriesAndActions
  >;
  const agentId = 'a.b.c';

  const pendingActionsMock = () => {
    useGetEndpointPendingActionsSummaryMock.mockReturnValue({
      data: {
        data: [
          new EndpointActionGenerator('seed').generateAgentPendingActionsSummary({
            agent_id: agentId,
            pending_actions: {
              isolate: 0,
            },
          }),
        ],
      },
    });
  };

  const endpointDetailsMock = () => {
    const newDate = new Date('2023-04-20T09:37:40.309Z');
    const endpointMetadata = new EndpointMetadataGenerator('seed').generateHostInfo({
      metadata: {
        '@timestamp': newDate.getTime(),
        agent: {
          id: agentId,
          version: '8.8.0',
        },
        elastic: {
          agent: { id: agentId },
        },
        Endpoint: {
          state: {
            isolation: false,
          },
        },
      },
      last_checkin: newDate.toISOString(),
    });
    useGetEndpointDetailsMock.mockReturnValue({
      data: endpointMetadata,
      isFetching: false,
      isFetched: true,
    });
  };

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    // Workaround for timeout via https://github.com/testing-library/user-event/issues/833#issuecomment-1171452841
    user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const mockedContext = createAppRootMockRenderer();

    render = async (capabilities: EndpointCapabilities[] = [...ENDPOINT_CAPABILITIES]) => {
      renderResult = mockedContext.render(
        <ConsoleManagerTestComponent
          registerConsoleProps={() => {
            return {
              consoleProps: {
                'data-test-subj': 'test',
                commands: getEndpointConsoleCommands({
                  agentType: 'endpoint',
                  endpointAgentId: 'a.b.c',
                  endpointCapabilities: [...capabilities],
                  endpointPrivileges: {
                    ...getEndpointAuthzInitialState(),
                    loading: false,
                  },
                }),
              },
            };
          }}
        />
      );

      consoleManagerMockAccess = getConsoleManagerMockRenderResultQueriesAndActions(
        user,
        renderResult
      );

      await consoleManagerMockAccess.clickOnRegisterNewConsole();
      await consoleManagerMockAccess.openRunningConsole();

      return renderResult;
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should show expected status output', async () => {
    pendingActionsMock();
    endpointDetailsMock();
    await render();
    await enterConsoleCommand(renderResult, user, 'status');
    const statusResults = renderResult.getByTestId('agent-status-console-output');

    expect(
      Array.from(statusResults.querySelectorAll('dt')).map((term) => term.textContent)
    ).toEqual([
      'Agent status',
      'Platform',
      'Version',
      'Policy status',
      'Policy version',
      'Policy name',
      'Last active',
    ]);

    expect(
      Array.from(statusResults.querySelectorAll('dd')).map((detail) => detail.textContent)
    ).toEqual([
      'Healthy',
      'Windows Server 2012R2',
      '8.8.0',
      'Success',
      'v3',
      'With Eventing',
      'Apr 20, 2023 @ 09:37:40.309',
    ]);
  });
});
