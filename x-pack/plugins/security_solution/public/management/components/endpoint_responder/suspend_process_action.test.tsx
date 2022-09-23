/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppContextTestRender } from '../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../common/mock/endpoint';
import {
  ConsoleManagerTestComponent,
  getConsoleManagerMockRenderResultQueriesAndActions,
} from '../console/components/console_manager/mocks';
import React from 'react';
import { getEndpointResponseActionsConsoleCommands } from './endpoint_response_actions_console_commands';
import { enterConsoleCommand } from '../console/mocks';
import { waitFor } from '@testing-library/react';
import { responseActionsHttpMocks } from '../../mocks/response_actions_http_mocks';
import type { ResponderCapabilities } from '../../../../common/endpoint/constants';
import { RESPONDER_CAPABILITIES } from '../../../../common/endpoint/constants';

describe('When using the suspend-process action from response actions console', () => {
  let render: (
    capabilities?: ResponderCapabilities[]
  ) => Promise<ReturnType<AppContextTestRender['render']>>;
  let renderResult: ReturnType<AppContextTestRender['render']>;
  let apiMocks: ReturnType<typeof responseActionsHttpMocks>;
  let consoleManagerMockAccess: ReturnType<
    typeof getConsoleManagerMockRenderResultQueriesAndActions
  >;

  beforeEach(() => {
    const mockedContext = createAppRootMockRenderer();

    apiMocks = responseActionsHttpMocks(mockedContext.coreStart.http);

    render = async (capabilities: ResponderCapabilities[] = [...RESPONDER_CAPABILITIES]) => {
      renderResult = mockedContext.render(
        <ConsoleManagerTestComponent
          registerConsoleProps={() => {
            return {
              consoleProps: {
                'data-test-subj': 'test',
                commands: getEndpointResponseActionsConsoleCommands({
                  endpointAgentId: 'a.b.c',
                  endpointCapabilities: [...capabilities],
                }),
              },
            };
          }}
        />
      );

      consoleManagerMockAccess = getConsoleManagerMockRenderResultQueriesAndActions(renderResult);

      await consoleManagerMockAccess.clickOnRegisterNewConsole();
      await consoleManagerMockAccess.openRunningConsole();

      return renderResult;
    };
  });

  it('should show an error if the `suspend_process` capability is not present in the endpoint', async () => {
    await render([]);
    enterConsoleCommand(renderResult, 'suspend-process --pid 123');

    expect(renderResult.getByTestId('test-validationError-message').textContent).toEqual(
      'The current version of the Agent does not support this feature. Upgrade your Agent through Fleet to use this feature and new response actions such as killing and suspending processes.'
    );
  });

  it('should call `suspend-process` api when command is entered', async () => {
    await render();
    enterConsoleCommand(renderResult, 'suspend-process --pid 123');

    await waitFor(() => {
      expect(apiMocks.responseProvider.suspendProcess).toHaveBeenCalledTimes(1);
    });
  });

  it('should accept an optional `--comment`', async () => {
    await render();
    enterConsoleCommand(renderResult, 'suspend-process --pid 123 --comment "This is a comment"');

    await waitFor(() => {
      expect(apiMocks.responseProvider.suspendProcess).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.stringContaining('This is a comment'),
        })
      );
    });
  });

  it('should only accept one `--comment`', async () => {
    await render();
    enterConsoleCommand(renderResult, 'suspend-process --pid 123 --comment "one" --comment "two"');

    expect(renderResult.getByTestId('test-badArgument-message').textContent).toEqual(
      'Argument can only be used once: --comment'
    );
  });

  it('should only accept one exclusive argument', async () => {
    await render();
    enterConsoleCommand(renderResult, 'suspend-process --pid 123 --entityId 123wer');

    expect(renderResult.getByTestId('test-badArgument-message').textContent).toEqual(
      'This command supports only one of the following arguments: --pid, --entityId'
    );
  });

  it('should check for at least one exclusive argument', async () => {
    await render();
    enterConsoleCommand(renderResult, 'suspend-process');

    expect(renderResult.getByTestId('test-badArgument-message').textContent).toEqual(
      'This command supports only one of the following arguments: --pid, --entityId'
    );
  });

  it('should check the pid has a given value', async () => {
    await render();
    enterConsoleCommand(renderResult, 'suspend-process --pid');

    expect(renderResult.getByTestId('test-badArgument-message').textContent).toEqual(
      'Invalid argument value: --pid. Argument cannot be empty'
    );
  });

  it('should check the pid has a non-empty value', async () => {
    await render();
    enterConsoleCommand(renderResult, 'suspend-process --pid "   "');

    expect(renderResult.getByTestId('test-badArgument-message').textContent).toEqual(
      'Invalid argument value: --pid. Argument cannot be empty'
    );
  });

  it('should check the pid has a non-negative value', async () => {
    await render();
    enterConsoleCommand(renderResult, 'suspend-process --pid -123');

    expect(renderResult.getByTestId('test-badArgument-message').textContent).toEqual(
      'Invalid argument value: --pid. Argument must be a positive number representing the PID of a process'
    );
  });

  it('should check the pid is a number', async () => {
    await render();
    enterConsoleCommand(renderResult, 'suspend-process --pid asd');

    expect(renderResult.getByTestId('test-badArgument-message').textContent).toEqual(
      'Invalid argument value: --pid. Argument must be a positive number representing the PID of a process'
    );
  });

  it('should check the entityId has a given value', async () => {
    await render();
    enterConsoleCommand(renderResult, 'suspend-process --entityId');

    expect(renderResult.getByTestId('test-badArgument-message').textContent).toEqual(
      'Invalid argument value: --entityId. Argument cannot be empty'
    );
  });

  it('should check the entity id has a non-empty value', async () => {
    await render();
    enterConsoleCommand(renderResult, 'suspend-process --entityId "   "');

    expect(renderResult.getByTestId('test-badArgument-message').textContent).toEqual(
      'Invalid argument value: --entityId. Argument cannot be empty'
    );
  });

  it('should call the action status api after creating the `suspend-process` request', async () => {
    await render();
    enterConsoleCommand(renderResult, 'suspend-process --pid 123');

    await waitFor(() => {
      expect(apiMocks.responseProvider.actionDetails).toHaveBeenCalled();
    });
  });

  it('should show success when `suspend-process` action completes with no errors when using `pid`', async () => {
    await render();
    enterConsoleCommand(renderResult, 'suspend-process --pid 123');

    await waitFor(() => {
      expect(renderResult.getByTestId('suspendProcessSuccessCallout')).toBeTruthy();
    });
  });

  it('should show success when `suspend-process` action completes with no errors when using `entityId`', async () => {
    await render();
    enterConsoleCommand(renderResult, 'suspend-process --entityId 123wer');

    await waitFor(() => {
      expect(renderResult.getByTestId('suspendProcessSuccessCallout')).toBeTruthy();
    });
  });

  it('should show error if suspend-process failed to complete successfully', async () => {
    const pendingDetailResponse = apiMocks.responseProvider.actionDetails({
      path: '/api/endpoint/action/1.2.3',
    });
    pendingDetailResponse.data.wasSuccessful = false;
    pendingDetailResponse.data.errors = ['error one', 'error two'];
    apiMocks.responseProvider.actionDetails.mockReturnValue(pendingDetailResponse);
    await render();
    enterConsoleCommand(renderResult, 'suspend-process --pid 123');

    await waitFor(() => {
      expect(renderResult.getByTestId('suspendProcessErrorCallout').textContent).toMatch(
        /error one \| error two/
      );
    });
  });

  it('should show error if kill-process API fails', async () => {
    apiMocks.responseProvider.suspendProcess.mockRejectedValueOnce({
      status: 500,
      message: 'this is an error',
    } as never);
    await render();
    enterConsoleCommand(renderResult, 'suspend-process --pid 123');

    await waitFor(() => {
      expect(renderResult.getByTestId('suspendProcessAPIErrorCallout').textContent).toMatch(
        /this is an error/
      );
    });
  });

  describe('and when console is closed (not terminated) and then reopened', () => {
    beforeEach(() => {
      const _render = render;

      render = async () => {
        const response = await _render();
        enterConsoleCommand(response, 'suspend-process --pid 123');

        await waitFor(() => {
          expect(apiMocks.responseProvider.suspendProcess).toHaveBeenCalledTimes(1);
        });

        // Hide the console
        await consoleManagerMockAccess.hideOpenedConsole();

        return response;
      };
    });

    it('should NOT send the `suspend-process` request again', async () => {
      await render();
      await consoleManagerMockAccess.openRunningConsole();

      expect(apiMocks.responseProvider.suspendProcess).toHaveBeenCalledTimes(1);
    });

    it('should continue to check action status when still pending', async () => {
      const pendingDetailResponse = apiMocks.responseProvider.actionDetails({
        path: '/api/endpoint/action/1.2.3',
      });
      pendingDetailResponse.data.isCompleted = false;
      apiMocks.responseProvider.actionDetails.mockReturnValue(pendingDetailResponse);
      await render();

      expect(apiMocks.responseProvider.actionDetails).toHaveBeenCalledTimes(2);

      await consoleManagerMockAccess.openRunningConsole();

      await waitFor(() => {
        expect(apiMocks.responseProvider.actionDetails).toHaveBeenCalledTimes(3);
      });
    });

    // FLAKY: https://github.com/elastic/kibana/issues/140119
    it.skip('should display completion output if done (no additional API calls)', async () => {
      await render();

      expect(apiMocks.responseProvider.actionDetails).toHaveBeenCalledTimes(1);

      await consoleManagerMockAccess.openRunningConsole();

      expect(apiMocks.responseProvider.actionDetails).toHaveBeenCalledTimes(1);
    });
  });
});
