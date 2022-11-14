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
import { enterConsoleCommand } from '../../../console/mocks';
import { waitFor } from '@testing-library/react';
import { getDeferred } from '../../../../mocks/utils';
import { getEndpointAuthzInitialState } from '../../../../../../common/endpoint/service/authz';
import type { EndpointCapabilities } from '../../../../../../common/endpoint/service/response_actions/constants';
import { ENDPOINT_CAPABILITIES } from '../../../../../../common/endpoint/service/response_actions/constants';

jest.mock('../../../../../common/experimental_features_service');

describe('When using isolate action from response actions console', () => {
  let render: (
    capabilities?: EndpointCapabilities[]
  ) => Promise<ReturnType<AppContextTestRender['render']>>;
  let renderResult: ReturnType<AppContextTestRender['render']>;
  let apiMocks: ReturnType<typeof responseActionsHttpMocks>;
  let consoleManagerMockAccess: ReturnType<
    typeof getConsoleManagerMockRenderResultQueriesAndActions
  >;

  beforeEach(() => {
    const mockedContext = createAppRootMockRenderer();

    apiMocks = responseActionsHttpMocks(mockedContext.coreStart.http);

    render = async (capabilities: EndpointCapabilities[] = [...ENDPOINT_CAPABILITIES]) => {
      renderResult = mockedContext.render(
        <ConsoleManagerTestComponent
          registerConsoleProps={() => {
            return {
              consoleProps: {
                'data-test-subj': 'test',
                commands: getEndpointConsoleCommands({
                  endpointAgentId: 'a.b.c',
                  endpointCapabilities: [...capabilities],
                  endpointPrivileges: {
                    ...getEndpointAuthzInitialState(),
                    loading: false,
                    canIsolateHost: true,
                  },
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

  it('should show an error if the `isolation` capability is not present in the endpoint', async () => {
    await render([]);
    enterConsoleCommand(renderResult, 'isolate');

    expect(renderResult.getByTestId('test-validationError-message').textContent).toEqual(
      'The current version of the Agent does not support this feature. Upgrade your Agent through Fleet to use this feature and new response actions such as killing and suspending processes.'
    );
  });

  it('should call `isolate` api when command is entered', async () => {
    await render();
    enterConsoleCommand(renderResult, 'isolate');

    await waitFor(() => {
      expect(apiMocks.responseProvider.isolateHost).toHaveBeenCalledTimes(1);
    });
  });

  it('should accept an optional `--comment`', async () => {
    await render();
    enterConsoleCommand(renderResult, 'isolate --comment "This is a comment"');

    await waitFor(() => {
      expect(apiMocks.responseProvider.isolateHost).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.stringContaining('This is a comment'),
        })
      );
    });
  });

  it('should only accept one `--comment`', async () => {
    await render();
    enterConsoleCommand(renderResult, 'isolate --comment "one" --comment "two"');

    expect(renderResult.getByTestId('test-badArgument-message').textContent).toEqual(
      'Argument can only be used once: --comment'
    );
  });

  it('should call the action status api after creating the `isolate` request', async () => {
    await render();
    enterConsoleCommand(renderResult, 'isolate');

    await waitFor(() => {
      expect(apiMocks.responseProvider.actionDetails).toHaveBeenCalled();
    });
  });

  it('should show success when `isolate` action completes with no errors', async () => {
    await render();
    enterConsoleCommand(renderResult, 'isolate');

    await waitFor(() => {
      expect(renderResult.getByTestId('isolate-success')).toBeTruthy();
    });
  });

  it('should show error if isolate failed to complete successfully', async () => {
    const pendingDetailResponse = apiMocks.responseProvider.actionDetails({
      path: '/api/endpoint/action/1.2.3',
    });
    pendingDetailResponse.data.wasSuccessful = false;
    pendingDetailResponse.data.errors = ['error one', 'error two'];
    apiMocks.responseProvider.actionDetails.mockReturnValue(pendingDetailResponse);
    await render();
    enterConsoleCommand(renderResult, 'isolate');

    await waitFor(() => {
      expect(renderResult.getByTestId('isolate-actionFailure').textContent).toMatch(
        /error one \| error two/
      );
    });
  });

  it('should create action request and store id even if console is closed prior to request api response', async () => {
    const deferrable = getDeferred();
    apiMocks.responseProvider.isolateHost.mockDelay.mockReturnValue(deferrable.promise);
    await render();

    // enter command
    enterConsoleCommand(renderResult, 'isolate');
    // hide console
    await consoleManagerMockAccess.hideOpenedConsole();

    // Release API response
    deferrable.resolve();
    await waitFor(() => {
      expect(apiMocks.responseProvider.isolateHost).toHaveBeenCalledTimes(1);
    });

    // open console
    await consoleManagerMockAccess.openRunningConsole();
    // status should be updating
    await waitFor(() => {
      expect(apiMocks.responseProvider.actionDetails.mock.calls.length).toBeGreaterThan(0);
    });
  });

  describe('and when console is closed (not terminated) and then reopened', () => {
    beforeEach(() => {
      const _render = render;

      render = async () => {
        const response = await _render();
        enterConsoleCommand(response, 'isolate');

        await waitFor(() => {
          expect(apiMocks.responseProvider.isolateHost).toHaveBeenCalledTimes(1);
          expect(apiMocks.responseProvider.actionDetails).toHaveBeenCalledTimes(1);
        });

        // Hide the console
        await consoleManagerMockAccess.hideOpenedConsole();

        return response;
      };
    });

    it('should NOT send the `isolate` request again', async () => {
      await render();
      await consoleManagerMockAccess.openRunningConsole();

      expect(apiMocks.responseProvider.isolateHost).toHaveBeenCalledTimes(1);
    });

    it('should continue to check action status when still pending', async () => {
      const pendingDetailResponse = apiMocks.responseProvider.actionDetails({
        path: '/api/endpoint/action/1.2.3',
      });
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
});
