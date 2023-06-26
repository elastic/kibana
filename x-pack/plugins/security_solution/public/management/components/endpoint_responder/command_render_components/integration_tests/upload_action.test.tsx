/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  type EndpointCapabilities,
  ENDPOINT_CAPABILITIES,
} from '../../../../../../common/endpoint/service/response_actions/constants';
import {
  type AppContextTestRender,
  createAppRootMockRenderer,
} from '../../../../../common/mock/endpoint';
import { responseActionsHttpMocks } from '../../../../mocks/response_actions_http_mocks';
import {
  ConsoleManagerTestComponent,
  getConsoleManagerMockRenderResultQueriesAndActions,
} from '../../../console/components/console_manager/mocks';
import type {
  EndpointPrivileges,
  ResponseActionUploadOutputContent,
  ActionDetailsApiResponse,
} from '../../../../../../common/endpoint/types';
import { getEndpointAuthzInitialStateMock } from '../../../../../../common/endpoint/service/authz/mocks';
import { getEndpointConsoleCommands } from '../..';
import React from 'react';
import { getConsoleSelectorsAndActionMock } from '../../../console/mocks';
import { waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { executionTranslations } from '../../../console/components/console_state/state_update_handlers/translations';
import { UPLOAD_ROUTE } from '../../../../../../common/endpoint/constants';
import type { HttpFetchOptionsWithPath } from '@kbn/core-http-browser';
import {
  INSUFFICIENT_PRIVILEGES_FOR_COMMAND,
  UPGRADE_ENDPOINT_FOR_RESPONDER,
} from '../../../../../common/translations';
import { endpointActionResponseCodes } from '../../lib/endpoint_action_response_codes';

describe('When using `upload` response action', () => {
  let render: (
    capabilities?: EndpointCapabilities[]
  ) => Promise<ReturnType<AppContextTestRender['render']>>;
  let renderResult: ReturnType<AppContextTestRender['render']>;
  let apiMocks: ReturnType<typeof responseActionsHttpMocks>;
  let consoleManagerMockAccess: ReturnType<
    typeof getConsoleManagerMockRenderResultQueriesAndActions
  >;
  let endpointPrivileges: EndpointPrivileges;
  let endpointCapabilities: typeof ENDPOINT_CAPABILITIES;
  let file: File;
  let console: ReturnType<typeof getConsoleSelectorsAndActionMock>;

  beforeEach(() => {
    const mockedContext = createAppRootMockRenderer();

    mockedContext.setExperimentalFlag({ responseActionUploadEnabled: true });
    apiMocks = responseActionsHttpMocks(mockedContext.coreStart.http);
    endpointPrivileges = { ...getEndpointAuthzInitialStateMock(), loading: false };
    endpointCapabilities = [...ENDPOINT_CAPABILITIES];

    const fileContent = new Blob(['test']);
    file = new File([fileContent], 'test.json', { type: 'application/JSON' });

    render = async () => {
      renderResult = mockedContext.render(
        <ConsoleManagerTestComponent
          registerConsoleProps={() => {
            return {
              consoleProps: {
                'data-test-subj': 'test',
                commands: getEndpointConsoleCommands({
                  endpointAgentId: 'a.b.c',
                  endpointCapabilities,
                  endpointPrivileges,
                }),
              },
            };
          }}
        />
      );

      console = getConsoleSelectorsAndActionMock(renderResult);
      consoleManagerMockAccess = getConsoleManagerMockRenderResultQueriesAndActions(renderResult);

      await consoleManagerMockAccess.clickOnRegisterNewConsole();
      await consoleManagerMockAccess.openRunningConsole();

      return renderResult;
    };
  });

  afterEach(() => {
    // @ts-expect-error assignment of `undefined` to avoid leak from one test to the other
    console = undefined;
    // @ts-expect-error assignment of `undefined` to avoid leak from one test to the other
    consoleManagerMockAccess = undefined;
  });

  it('should require `--file` argument', async () => {
    await render();
    console.enterCommand('upload');

    await waitFor(() => {
      expect(renderResult.getByTestId('test-badArgument-message')).toHaveTextContent(
        executionTranslations.missingArguments('--file')
      );
    });
  });

  it('should error if `--file` argument is not set (no file selected)', async () => {
    await render();
    console.enterCommand('upload --file');

    await waitFor(() => {
      expect(renderResult.getByTestId('test-badArgument-message')).toHaveTextContent(
        executionTranslations.mustHaveValue('file')
      );
    });
  });

  it('should call upload api with expected payload', async () => {
    const { getByTestId } = await render();
    console.enterCommand('upload --file', { inputOnly: true });

    await waitFor(() => {
      userEvent.upload(getByTestId('console-arg-file-picker'), file);
    });

    console.submitCommand();

    await waitFor(() => {
      expect(apiMocks.responseProvider.upload).toHaveBeenCalledWith({
        body: expect.any(FormData),
        headers: {
          'Content-Type': undefined,
        },
        path: UPLOAD_ROUTE,
        version: '2023-10-31',
      });
    });

    const apiBody = (
      apiMocks.responseProvider.upload.mock.lastCall as unknown as [HttpFetchOptionsWithPath]
    )?.[0].body as FormData;

    expect(apiBody.get('file')).toEqual(file);
    expect(apiBody.get('endpoint_ids')).toEqual('["a.b.c"]');
    expect(apiBody.get('parameters')).toEqual('{}');
  });

  it('should allow `--overwrite` argument', async () => {
    const { getByTestId } = await render();
    console.enterCommand('upload --overwrite --file', { inputOnly: true });

    await waitFor(() => {
      userEvent.upload(getByTestId('console-arg-file-picker'), file);
    });

    console.submitCommand();

    await waitFor(() => {
      expect(apiMocks.responseProvider.upload).toHaveBeenCalled();
    });

    const apiBody = (
      apiMocks.responseProvider.upload.mock.lastCall as unknown as [HttpFetchOptionsWithPath]
    )?.[0].body as FormData;

    expect(apiBody.get('parameters')).toEqual('{"overwrite":true}');
  });

  it('should show an error if user has no authz to file operations', async () => {
    endpointPrivileges.canWriteFileOperations = false;
    const { getByTestId } = await render();
    console.enterCommand('upload --overwrite --file', { inputOnly: true });

    await waitFor(() => {
      userEvent.upload(getByTestId('console-arg-file-picker'), file);
    });

    console.submitCommand();

    await waitFor(() => {
      expect(getByTestId('test-validationError-message').textContent).toEqual(
        INSUFFICIENT_PRIVILEGES_FOR_COMMAND
      );
    });
  });

  it('should show an error if the endpoint does not support `upload_file` capability', async () => {
    endpointCapabilities = [] as unknown as typeof ENDPOINT_CAPABILITIES;
    const { getByTestId } = await render();
    console.enterCommand('upload --overwrite --file', { inputOnly: true });

    await waitFor(() => {
      userEvent.upload(getByTestId('console-arg-file-picker'), file);
    });

    console.submitCommand();

    await waitFor(() => {
      expect(getByTestId('test-validationError-message').textContent).toEqual(
        UPGRADE_ENDPOINT_FOR_RESPONDER
      );
    });
  });

  it.each([
    'ra_upload_error_failure',
    'ra_upload_already-exists',
    'ra_upload_error_not-found',
    'ra_upload_error_not-permitted',
    'ra_upload_error_too-big',
    'ra_upload_error_queue-timeout',
    'ra_upload_error_download-failed',
  ])('should show detailed error if upload failure returned code: %s', async (outputCode) => {
    const pendingDetailResponse = apiMocks.responseProvider.actionDetails({
      path: '/api/endpoint/action/a.b.c',
    }) as ActionDetailsApiResponse<ResponseActionUploadOutputContent>;
    pendingDetailResponse.data.agents = ['a.b.c'];
    pendingDetailResponse.data.wasSuccessful = false;
    pendingDetailResponse.data.errors = ['not found'];
    pendingDetailResponse.data.outputs = {
      'a.b.c': {
        type: 'json',
        content: {
          code: outputCode,
        } as unknown as ResponseActionUploadOutputContent,
      },
    };
    apiMocks.responseProvider.actionDetails.mockReturnValue(pendingDetailResponse);
    await render();

    console.enterCommand('upload --file', { inputOnly: true });
    await waitFor(() => {
      userEvent.upload(renderResult.getByTestId('console-arg-file-picker'), file);
    });

    console.submitCommand();

    await waitFor(() => {
      expect(renderResult.getByTestId('upload-actionFailure').textContent).toMatch(
        // RegExp below taken from: https://github.com/sindresorhus/escape-string-regexp/blob/main/index.js
        new RegExp(endpointActionResponseCodes[outputCode].replace(/[|\\{}()[\]^$+*?.]/g, '\\$&'))
      );
    });
  });
});
