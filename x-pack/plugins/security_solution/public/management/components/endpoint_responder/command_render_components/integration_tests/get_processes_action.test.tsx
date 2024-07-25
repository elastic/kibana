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
import { getEndpointConsoleCommands } from '../../lib/console_commands_definition';
import { responseActionsHttpMocks } from '../../../../mocks/response_actions_http_mocks';
import { enterConsoleCommand, getConsoleSelectorsAndActionMock } from '../../../console/mocks';
import { waitFor } from '@testing-library/react';
import { getEndpointAuthzInitialState } from '../../../../../../common/endpoint/service/authz';
import type {
  EndpointCapabilities,
  ResponseActionAgentType,
} from '../../../../../../common/endpoint/service/response_actions/constants';
import { ENDPOINT_CAPABILITIES } from '../../../../../../common/endpoint/service/response_actions/constants';
import { UPGRADE_AGENT_FOR_RESPONDER } from '../../../../../common/translations';
import type { CommandDefinition } from '../../../console';

describe('When using processes action from response actions console', () => {
  let mockedContext: AppContextTestRender;
  let render: () => Promise<ReturnType<AppContextTestRender['render']>>;
  let renderResult: ReturnType<AppContextTestRender['render']>;
  let apiMocks: ReturnType<typeof responseActionsHttpMocks>;
  let consoleManagerMockAccess: ReturnType<
    typeof getConsoleManagerMockRenderResultQueriesAndActions
  >;
  let consoleSelectors: ReturnType<typeof getConsoleSelectorsAndActionMock>;
  let consoleCommands: CommandDefinition[];

  const setConsoleCommands = (
    capabilities: EndpointCapabilities[] = [...ENDPOINT_CAPABILITIES],
    agentType: ResponseActionAgentType = 'endpoint'
  ): void => {
    consoleCommands = getEndpointConsoleCommands({
      agentType,
      endpointAgentId: 'a.b.c',
      endpointCapabilities: capabilities,
      endpointPrivileges: {
        ...getEndpointAuthzInitialState(),
        loading: false,
        canKillProcess: true,
        canSuspendProcess: true,
        canGetRunningProcesses: true,
      },
    });
  };

  beforeEach(() => {
    mockedContext = createAppRootMockRenderer();
    apiMocks = responseActionsHttpMocks(mockedContext.coreStart.http);
    setConsoleCommands();

    render = async () => {
      renderResult = mockedContext.render(
        <ConsoleManagerTestComponent
          registerConsoleProps={() => {
            return {
              consoleProps: {
                'data-test-subj': 'test',
                commands: consoleCommands,
              },
            };
          }}
        />
      );

      consoleManagerMockAccess = getConsoleManagerMockRenderResultQueriesAndActions(renderResult);

      await consoleManagerMockAccess.clickOnRegisterNewConsole();
      await consoleManagerMockAccess.openRunningConsole();
      consoleSelectors = getConsoleSelectorsAndActionMock(renderResult);

      return renderResult;
    };
  });

  it('should show an error if the `running_processes` capability is not present in the endpoint', async () => {
    setConsoleCommands([]);
    await render();
    enterConsoleCommand(renderResult, 'processes');

    expect(renderResult.getByTestId('test-validationError-message').textContent).toEqual(
      UPGRADE_AGENT_FOR_RESPONDER('endpoint', 'processes')
    );
  });

  it('should call `running-procs` api when command is entered', async () => {
    await render();
    enterConsoleCommand(renderResult, 'processes');

    await waitFor(() => {
      expect(apiMocks.responseProvider.processes).toHaveBeenCalledTimes(1);
    });
  });

  it('should accept an optional `--comment`', async () => {
    await render();
    enterConsoleCommand(renderResult, 'processes --comment "This is a comment"');

    await waitFor(() => {
      expect(apiMocks.responseProvider.processes).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.stringContaining('This is a comment'),
        })
      );
    });
  });

  it('should only accept one `--comment`', async () => {
    await render();
    enterConsoleCommand(renderResult, 'processes --comment "one" --comment "two"');

    expect(renderResult.getByTestId('test-badArgument-message').textContent).toEqual(
      'Argument can only be used once: --comment'
    );
  });

  it('should call the action status api after creating the `processes` request', async () => {
    await render();
    enterConsoleCommand(renderResult, 'processes');

    await waitFor(() => {
      expect(apiMocks.responseProvider.actionDetails).toHaveBeenCalled();
    });
  });

  it('should show success when `processes` action completes with no errors', async () => {
    await render();
    enterConsoleCommand(renderResult, 'processes');

    await waitFor(() => {
      expect(renderResult.getByTestId('getProcessesSuccessCallout')).toBeTruthy();
    });
  });

  it('should show error if get processes failed to complete successfully', async () => {
    const pendingDetailResponse = apiMocks.responseProvider.actionDetails({
      path: '/api/endpoint/action/1.2.3',
    });
    pendingDetailResponse.data.command = 'running-processes';
    pendingDetailResponse.data.wasSuccessful = false;
    pendingDetailResponse.data.agentState = {
      'agent-a': {
        isCompleted: true,
        wasSuccessful: false,
        errors: ['error one', 'error two'],
        completedAt: new Date().toISOString(),
      },
    };
    pendingDetailResponse.data.errors = ['error one', 'error two'];
    apiMocks.responseProvider.actionDetails.mockReturnValue(pendingDetailResponse);
    await render();
    enterConsoleCommand(renderResult, 'processes');

    await waitFor(() => {
      expect(renderResult.getByTestId('getProcesses-actionFailure').textContent).toMatch(
        /error one \| error two/
      );
    });
  });

  it('should show error if get processes request failed', async () => {
    // FIXME: have to identify this type error
    apiMocks.responseProvider.processes.mockRejectedValueOnce({
      status: 500,
      message: 'this is an error',
    } as never);
    await render();
    enterConsoleCommand(renderResult, 'processes');

    await waitFor(() => {
      expect(renderResult.getByTestId('getProcesses-apiFailure').textContent).toMatch(
        /this is an error/
      );
    });
  });

  describe('and when console is closed (not terminated) and then reopened', () => {
    beforeEach(() => {
      const _render = render;

      render = async () => {
        const response = await _render();
        enterConsoleCommand(response, 'processes');

        await waitFor(() => {
          expect(apiMocks.responseProvider.processes).toHaveBeenCalledTimes(1);
          expect(apiMocks.responseProvider.actionDetails).toHaveBeenCalledTimes(1);
        });

        // Hide the console
        await consoleManagerMockAccess.hideOpenedConsole();

        return response;
      };
    });

    it('should NOT send the `processes` request again', async () => {
      await render();
      await consoleManagerMockAccess.openRunningConsole();

      expect(apiMocks.responseProvider.processes).toHaveBeenCalledTimes(1);
    });

    it('should continue to check action status when still pending', async () => {
      const pendingDetailResponse = apiMocks.responseProvider.actionDetails({
        path: '/api/endpoint/action/1.2.3',
      });
      pendingDetailResponse.data.command = 'running-processes';
      pendingDetailResponse.data.isCompleted = false;
      apiMocks.responseProvider.actionDetails.mockClear();
      apiMocks.responseProvider.actionDetails.mockReturnValue(pendingDetailResponse);
      await render();

      expect(apiMocks.responseProvider.actionDetails).toHaveBeenCalledTimes(1);

      await consoleManagerMockAccess.openRunningConsole();

      await waitFor(() => {
        expect(apiMocks.responseProvider.actionDetails).toHaveBeenCalledTimes(2);
      });
    });

    it('should display completion output if done (no additional API calls)', async () => {
      await render();

      expect(apiMocks.responseProvider.actionDetails).toHaveBeenCalledTimes(1);

      await consoleManagerMockAccess.openRunningConsole();

      expect(apiMocks.responseProvider.actionDetails).toHaveBeenCalledTimes(1);
    });
  });

  describe('and when agent type is SentinelOne', () => {
    beforeEach(() => {
      mockedContext.setExperimentalFlag({ responseActionsSentinelOneProcessesEnabled: true });
      setConsoleCommands([], 'sentinel_one');
    });

    it('should display processes command --help', async () => {
      await render();
      enterConsoleCommand(renderResult, 'processes --help');

      await waitFor(() => {
        expect(renderResult.getByTestId('test-helpOutput').textContent).toEqual(
          'About' +
            'Show all running processes' +
            'Usage' +
            'processes [--comment]' +
            'Example' +
            'processes --comment "get the processes"' +
            'Optional parameters' +
            '--comment - A comment to go along with the action'
        );
      });
    });

    it('should display correct entry in help panel', async () => {
      await render();
      consoleSelectors.openHelpPanel();

      expect(
        renderResult.getByTestId('test-commandList-Responseactions-processes')
      ).toHaveTextContent('processesShow all running processes');
    });

    it('should call the api with agentType of SentinelOne', async () => {
      await render();
      enterConsoleCommand(renderResult, 'processes');

      await waitFor(() => {
        expect(apiMocks.responseProvider.processes).toHaveBeenCalledWith({
          body: '{"endpoint_ids":["a.b.c"],"agent_type":"sentinel_one"}',
          path: '/api/endpoint/action/running_procs',
          version: '2023-10-31',
        });
      });
    });

    it('should display download link to access results', async () => {
      await render();
      enterConsoleCommand(renderResult, 'processes');

      await waitFor(() => {
        expect(renderResult.getByTestId('getProcessesSuccessCallout').textContent).toEqual(
          'Click here to download(ZIP file passcode: elastic).' +
            'Files are periodically deleted to clear storage space. Download and save file locally if needed.'
        );
      });
    });

    describe('and `responseActionsSentinelOneProcessesEnabled` feature flag is disabled', () => {
      beforeEach(() => {
        mockedContext.setExperimentalFlag({ responseActionsSentinelOneProcessesEnabled: false });
        setConsoleCommands([], 'sentinel_one');
      });

      it('should not display `processes` command in console help', async () => {
        await render();
        consoleSelectors.openHelpPanel();

        expect(renderResult.queryByTestId('test-commandList-Responseactions-processes')).toBeNull();
      });

      it('should error if user enters `process` command', async () => {
        await render();
        enterConsoleCommand(renderResult, 'processes');

        await waitFor(() => {
          expect(renderResult.getByTestId('test-validationError')).toHaveTextContent(
            'Unsupported actionSupport for processes is not currently available for SentinelOne.'
          );
        });

        await waitFor(() => {
          expect(apiMocks.responseProvider.processes).not.toHaveBeenCalled();
        });
      });
    });
  });
});
