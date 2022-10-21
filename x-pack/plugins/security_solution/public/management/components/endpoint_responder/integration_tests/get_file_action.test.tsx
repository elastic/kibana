/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EndpointCapabilities } from '../../../../../common/endpoint/service/response_actions/constants';
import { ENDPOINT_CAPABILITIES } from '../../../../../common/endpoint/service/response_actions/constants';
import type { AppContextTestRender } from '../../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../../common/mock/endpoint';
import { responseActionsHttpMocks } from '../../../mocks/response_actions_http_mocks';
import {
  ConsoleManagerTestComponent,
  getConsoleManagerMockRenderResultQueriesAndActions,
} from '../../console/components/console_manager/mocks';
import { getEndpointResponseActionsConsoleCommands } from '..';
import React from 'react';
import { enterConsoleCommand } from '../../console/mocks';
import { waitFor } from '@testing-library/react';
import { GET_FILE_ROUTE } from '../../../../../common/endpoint/constants';
import { getEndpointAuthzInitialStateMock } from '../../../../../common/endpoint/service/authz/mocks';
import type { EndpointPrivileges } from '../../../../../common/endpoint/types';
import { INSUFFICIENT_PRIVILEGES_FOR_COMMAND } from '../../../../common/translations';

describe('When using get-file aciton from response actions console', () => {
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
                commands: getEndpointResponseActionsConsoleCommands({
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
      'The current version of the Agent does not support this feature. Upgrade your Agent through Fleet to use this feature and new response actions such as killing and suspending processes.'
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
});
