/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpApiTestSetupMock } from '../../mocks';
import { createHttpApiTestSetupMock } from '../../mocks';
import type { LogsEndpointAction } from '../../../../common/endpoint/types';
import { EndpointActionGenerator } from '../../../../common/endpoint/data_generators/endpoint_action_generator';
import { applyEsClientSearchMock } from '../../mocks/utils.mock';
import { ENDPOINT_ACTIONS_INDEX } from '../../../../common/endpoint/constants';
import { ensureUserHasAuthzToFilesForAction } from './utils';
import type { Mutable } from 'utility-types';
import type { KibanaRequest } from '@kbn/core-http-server';

describe('Route utilities', () => {
  describe('#ensureUserHasAuthzToFilesForAction()', () => {
    let testSetupMock: HttpApiTestSetupMock;
    let actionRequestMock: LogsEndpointAction;
    let httpRequestMock: Mutable<KibanaRequest<{ action_id: string }>>;

    beforeEach(() => {
      const endpointGenerator = new EndpointActionGenerator('seed');

      actionRequestMock = endpointGenerator.generate();
      testSetupMock = createHttpApiTestSetupMock();

      httpRequestMock = testSetupMock.createRequestMock({
        params: { action_id: actionRequestMock.EndpointActions.action_id },
      });

      applyEsClientSearchMock({
        esClientMock: testSetupMock.getEsClientMock(),
        index: ENDPOINT_ACTIONS_INDEX,
        response: endpointGenerator.toEsSearchResponse([
          endpointGenerator.toEsSearchHit(actionRequestMock),
        ]),
      });
    });

    it.each`
      command                | authzKey                       | agentType
      ${'get-file'}          | ${'canWriteFileOperations'}    | ${'endpoint'}
      ${'execute'}           | ${'canWriteExecuteOperations'} | ${'endpoint'}
      ${'running-processes'} | ${'canGetRunningProcesses'}    | ${'sentinel_one'}
    `(
      'should throw when user is not authorized to `$command` for $agentType',
      async ({ command, authzKey, agentType }) => {
        testSetupMock.setEndpointAuthz({ [authzKey]: false });
        actionRequestMock.EndpointActions.data.command = command;
        actionRequestMock.EndpointActions.input_type = agentType;

        await expect(() =>
          ensureUserHasAuthzToFilesForAction(testSetupMock.httpHandlerContextMock, httpRequestMock)
        ).rejects.toThrow('Endpoint authorization failure');
      }
    );

    it('should throw when response action is not supported by agent type', async () => {
      actionRequestMock.EndpointActions.input_type = 'sentinel_one';
      actionRequestMock.EndpointActions.data.command = 'execute';

      await expect(() =>
        ensureUserHasAuthzToFilesForAction(testSetupMock.httpHandlerContextMock, httpRequestMock)
      ).rejects.toThrow('Response action [execute] not supported for agent type [sentinel_one]');
    });

    it('should throw when response action does not support access to files', async () => {
      actionRequestMock.EndpointActions.data.command = 'running-processes';

      await expect(() =>
        ensureUserHasAuthzToFilesForAction(testSetupMock.httpHandlerContextMock, httpRequestMock)
      ).rejects.toThrow(
        'Response action [running-processes] for agent type [endpoint] does not support file downloads'
      );
    });
  });
});
