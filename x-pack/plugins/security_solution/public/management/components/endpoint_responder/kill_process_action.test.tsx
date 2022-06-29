/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AppContextTestRender, createAppRootMockRenderer } from '../../../common/mock/endpoint';
import {
  ConsoleManagerTestComponent,
  getConsoleManagerMockRenderResultQueriesAndActions,
} from '../console/components/console_manager/mocks';
import React from 'react';
import { getEndpointResponseActionsConsoleCommands } from './endpoint_response_actions_console_commands';
import { enterConsoleCommand } from '../console/mocks';
import { waitFor } from '@testing-library/react';
import { responseActionsHttpMocks } from '../../mocks/response_actions_http_mocks';

describe('When using the kill-process action from response actions console', () => {
  let render: () => Promise<ReturnType<AppContextTestRender['render']>>;
  let renderResult: ReturnType<AppContextTestRender['render']>;
  let apiMocks: ReturnType<typeof responseActionsHttpMocks>;
  let consoleManagerMockAccess: ReturnType<
    typeof getConsoleManagerMockRenderResultQueriesAndActions
  >;

  beforeEach(() => {
    const mockedContext = createAppRootMockRenderer();

    apiMocks = responseActionsHttpMocks(mockedContext.coreStart.http);

    render = async () => {
      renderResult = mockedContext.render(
        <ConsoleManagerTestComponent
          registerConsoleProps={() => {
            return {
              consoleProps: {
                'data-test-subj': 'test',
                commands: getEndpointResponseActionsConsoleCommands('a.b.c'),
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

  it('should call `kill-process` api when command is entered', async () => {
    await render();
    enterConsoleCommand(renderResult, 'kill-process --pid 123');

    await waitFor(() => {
      expect(apiMocks.responseProvider.killProcess).toHaveBeenCalledTimes(1);
    });
  });

  it('should accept an optional `--comment`', async () => {
    await render();
    enterConsoleCommand(renderResult, 'kill-process --pid 123 --comment "This is a comment"');

    await waitFor(() => {
      expect(apiMocks.responseProvider.killProcess).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.stringContaining('This is a comment'),
        })
      );
    });
  });

  it('should only accept one `--comment`', async () => {
    await render();
    enterConsoleCommand(renderResult, 'kill-process --pid 123 --comment "one" --comment "two"');

    expect(renderResult.getByTestId('test-badArgument-message').textContent).toEqual(
      'Argument can only be used once: --comment'
    );
  });

  it('should call the action status api after creating the `kill-process` request', async () => {
    await render();
    enterConsoleCommand(renderResult, 'kill-process --pid 123');

    await waitFor(() => {
      expect(apiMocks.responseProvider.actionDetails).toHaveBeenCalled();
    });
  });

  it('should show success when `kill-process` action completes with no errors', async () => {
    await render();
    enterConsoleCommand(renderResult, 'kill-process --pid 123');

    await waitFor(() => {
      expect(renderResult.getByTestId('killProcessSuccessCallout')).toBeTruthy();
    });
  });

  it('should show error if kill-process failed to complete successfully', async () => {
    const pendingDetailResponse = apiMocks.responseProvider.actionDetails({
      path: '/api/endpoint/action/1.2.3',
    });
    pendingDetailResponse.data.wasSuccessful = false;
    pendingDetailResponse.data.errors = ['error one', 'error two'];
    apiMocks.responseProvider.actionDetails.mockReturnValue(pendingDetailResponse);
    await render();
    enterConsoleCommand(renderResult, 'kill-process --pid 123');

    await waitFor(() => {
      expect(renderResult.getByTestId('killProcessErrorCallout').textContent).toMatch(
        /error one \| error two/
      );
    });
  });

  describe('and when console is closed (not terminated) and then reopened', () => {
    beforeEach(() => {
      const _render = render;

      render = async () => {
        const response = await _render();
        enterConsoleCommand(response, 'kill-process --pid 123');

        await waitFor(() => {
          expect(apiMocks.responseProvider.killProcess).toHaveBeenCalledTimes(1);
        });

        // Hide the console
        await consoleManagerMockAccess.hideOpenedConsole();

        return response;
      };
    });

    it('should NOT send the `kill-process` request again', async () => {
      await render();
      await consoleManagerMockAccess.openRunningConsole();

      expect(apiMocks.responseProvider.killProcess).toHaveBeenCalledTimes(1);
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

    it('should display completion output if done (no additional API calls)', async () => {
      await render();

      expect(apiMocks.responseProvider.actionDetails).toHaveBeenCalledTimes(1);

      await consoleManagerMockAccess.openRunningConsole();

      expect(apiMocks.responseProvider.actionDetails).toHaveBeenCalledTimes(1);
    });
  });
});
