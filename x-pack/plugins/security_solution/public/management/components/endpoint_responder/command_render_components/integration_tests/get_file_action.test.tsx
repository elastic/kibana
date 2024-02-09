/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EndpointCapabilities } from '../../../../../../common/endpoint/service/response_actions/constants';
import { ENDPOINT_CAPABILITIES } from '../../../../../../common/endpoint/service/response_actions/constants';
import type { AppContextTestRender } from '../../../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../../../common/mock/endpoint';
import { responseActionsHttpMocks } from '../../../../mocks/response_actions_http_mocks';
import {
  ConsoleManagerTestComponent,
  getConsoleManagerMockRenderResultQueriesAndActions,
} from '../../../console/components/console_manager/mocks';
import { getEndpointConsoleCommands } from '../../lib/console_commands_definition';
import React from 'react';
import { enterConsoleCommand } from '../../../console/mocks';
import { waitFor } from '@testing-library/react';
import { GET_FILE_ROUTE } from '../../../../../../common/endpoint/constants';
import { getEndpointAuthzInitialStateMock } from '../../../../../../common/endpoint/service/authz/mocks';
import type {
  ActionDetailsApiResponse,
  EndpointPrivileges,
  ResponseActionGetFileOutputContent,
} from '../../../../../../common/endpoint/types';
import {
  INSUFFICIENT_PRIVILEGES_FOR_COMMAND,
  UPGRADE_AGENT_FOR_RESPONDER,
} from '../../../../../common/translations';
import type { HttpFetchOptionsWithPath } from '@kbn/core-http-browser';
import { endpointActionResponseCodes } from '../../lib/endpoint_action_response_codes';

jest.mock('../../../../../common/components/user_privileges');
jest.mock('../../../../../common/experimental_features_service');

describe('When using get-file action from response actions console', () => {
  let render: (
    capabilities?: EndpointCapabilities[]
  ) => Promise<ReturnType<AppContextTestRender['render']>>;
  let renderResult: ReturnType<AppContextTestRender['render']>;
  let apiMocks: ReturnType<typeof responseActionsHttpMocks>;
  let consoleManagerMockAccess: ReturnType<
    typeof getConsoleManagerMockRenderResultQueriesAndActions
  >;
  let endpointPrivileges: EndpointPrivileges;

  beforeEach(() => {
    const mockedContext = createAppRootMockRenderer();

    apiMocks = responseActionsHttpMocks(mockedContext.coreStart.http);
    endpointPrivileges = { ...getEndpointAuthzInitialStateMock(), loading: false };

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
                  endpointPrivileges,
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

  it('should show an error if the `get_file` capability is not present in the endpoint', async () => {
    await render([]);
    enterConsoleCommand(renderResult, 'get-file --path="one/two"');

    expect(renderResult.getByTestId('test-validationError-message').textContent).toEqual(
      UPGRADE_AGENT_FOR_RESPONDER('endpoint', 'get-file')
    );
  });

  it('should show an error if the `get-file` is not authorized', async () => {
    endpointPrivileges.canWriteFileOperations = false;
    await render();
    enterConsoleCommand(renderResult, 'get-file --path="one/two"');

    expect(renderResult.getByTestId('test-validationError-message').textContent).toEqual(
      INSUFFICIENT_PRIVILEGES_FOR_COMMAND
    );
  });

  it('should show an error if `get-file` is entered without `--path` argument', async () => {
    await render([]);
    enterConsoleCommand(renderResult, 'get-file');

    expect(renderResult.getByTestId('test-badArgument-message').textContent).toEqual(
      'Missing required arguments: --path'
    );
  });

  it('should show error if `--path` is empty string', async () => {
    await render();
    enterConsoleCommand(renderResult, 'get-file --path=""');

    expect(renderResult.getByTestId('test-badArgument-message').textContent).toEqual(
      'Invalid argument value: --path. Argument cannot be empty'
    );
  });

  it('should call the `get_file` api with the expected payload', async () => {
    await render();
    enterConsoleCommand(renderResult, 'get-file --path="one/two"');

    await waitFor(() => {
      expect(apiMocks.responseProvider.getFile).toHaveBeenCalledWith({
        body: '{"endpoint_ids":["a.b.c"],"parameters":{"path":"one/two"}}',
        path: GET_FILE_ROUTE,
        version: '2023-10-31',
      });
    });
  });

  it('should only accept one `--comment`', async () => {
    await render();
    enterConsoleCommand(renderResult, 'get-file --path="one/two" --comment "one" --comment "two"');

    expect(renderResult.getByTestId('test-badArgument-message').textContent).toEqual(
      'Argument can only be used once: --comment'
    );
  });

  it('should display download link once action completes', async () => {
    const actionDetailsApiResponseMock: ReturnType<typeof apiMocks.responseProvider.actionDetails> =
      {
        data: {
          ...apiMocks.responseProvider.actionDetails({
            path: '/1',
          } as HttpFetchOptionsWithPath).data,

          completedAt: new Date().toISOString(),
          command: 'get-file',
        },
      };
    apiMocks.responseProvider.actionDetails.mockReturnValue(actionDetailsApiResponseMock);

    await render();
    enterConsoleCommand(renderResult, 'get-file --path="one/two"');

    await waitFor(() => {
      expect(apiMocks.responseProvider.actionDetails).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(renderResult.getByTestId('getFileSuccess').textContent).toEqual(
        'File retrieved from the host.Click here to download(ZIP file passcode: elastic).Files are periodically deleted to clear storage space. Download and save file locally if needed.'
      );
    });
  });

  it.each([
    'ra_get-file_error_not-found',
    'ra_get-file_error_is-directory',
    'ra_get-file_error_invalid-input',
    'ra_get-file_error_not-permitted',
    'ra_get-file_error_too-big',
    'ra_get-file_error_disk-quota',
    'ra_get-file_error_processing',
    'ra_get-file_error_upload-api-unreachable',
    'ra_get-file_error_upload-timeout',
    'ra_get-file_error_queue-timeout',
  ])('should show detailed error if get-file failure returned code: %s', async (outputCode) => {
    const pendingDetailResponse = apiMocks.responseProvider.actionDetails({
      path: '/api/endpoint/action/a.b.c',
    }) as ActionDetailsApiResponse<ResponseActionGetFileOutputContent>;
    pendingDetailResponse.data.agents = ['a.b.c'];
    pendingDetailResponse.data.wasSuccessful = false;
    pendingDetailResponse.data.errors = ['not found'];
    pendingDetailResponse.data.outputs = {
      'a.b.c': {
        type: 'json',
        content: {
          code: outputCode,
        } as unknown as ResponseActionGetFileOutputContent,
      },
    };
    apiMocks.responseProvider.actionDetails.mockReturnValue(pendingDetailResponse);
    await render();
    enterConsoleCommand(renderResult, 'get-file --path one');

    await waitFor(() => {
      expect(renderResult.getByTestId('getFile-actionFailure').textContent).toMatch(
        // RegExp below taken from: https://github.com/sindresorhus/escape-string-regexp/blob/main/index.js
        new RegExp(endpointActionResponseCodes[outputCode].replace(/[|\\{}()[\]^$+*?.]/g, '\\$&'))
      );
    });
  });
});
