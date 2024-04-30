/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  loggingSystemMock,
  savedObjectsClientMock,
  savedObjectsServiceMock,
} from '@kbn/core/server/mocks';
import { licenseMock } from '@kbn/licensing-plugin/common/licensing.mock';
import type { ILicense } from '@kbn/licensing-plugin/common/types';
import { Subject } from 'rxjs';

import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';

import type { SavedObjectError } from '@kbn/core-saved-objects-common';

import type { SavedObjectsServiceStart } from '@kbn/core-saved-objects-server';

import type { AgentPolicy } from '../../common';
import { AGENT_POLICY_SAVED_OBJECT_TYPE } from '../../common';

import { LicenseService } from '../../common/services';

import { createAgentPolicyMock } from '../../common/mocks';

import { PolicyWatcher } from './agent_policy_watch';
import { agentPolicyService } from './agent_policy';

jest.mock('./agent_policy');
const agentPolicySvcMock = agentPolicyService as jest.Mocked<typeof agentPolicyService>;

describe('Agent Policy-Changing license watcher', () => {
  const logger = loggingSystemMock.create().get('license_watch.test');
  const Platinum = licenseMock.createLicense({ license: { type: 'platinum', mode: 'platinum' } });
  const Basic = licenseMock.createLicense({ license: { type: 'basic', mode: 'basic' } });
  let soStartMock: jest.Mocked<SavedObjectsServiceStart>;
  let soClientMock: jest.Mocked<SavedObjectsClientContract>;

  beforeEach(() => {
    soStartMock = savedObjectsServiceMock.createStartContract();
    soClientMock = savedObjectsClientMock.create();
    soStartMock.getScopedClient.mockReturnValue(soClientMock);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createPolicySO = (id: string, isProtected: boolean, error?: SavedObjectError) => ({
    id,
    type: AGENT_POLICY_SAVED_OBJECT_TYPE,
    attributes: {
      is_protected: isProtected,
    },
    references: [],
    score: 1,
    ...(error ? { error } : {}),
  });

  it('is activated on license changes', () => {
    // mock a license-changing service to test reactivity
    const licenseEmitter: Subject<ILicense> = new Subject();
    const licenseService = new LicenseService();
    const pw = new PolicyWatcher(soStartMock, logger);

    // swap out watch function, just to ensure it gets called when a license change happens
    const mockWatch = jest.fn();
    pw.watch = mockWatch;

    // licenseService is watching our subject for incoming licenses
    licenseService.start(licenseEmitter);
    pw.start(licenseService); // and the PolicyWatcher under test, uses that to subscribe as well

    // Enqueue a license change!
    licenseEmitter.next(Platinum);

    // policywatcher should have triggered
    expect(mockWatch.mock.calls.length).toBe(1);

    pw.stop();
    licenseService.stop();
    licenseEmitter.complete();
  });

  it('should return if all policies are compliant', async () => {
    jest.spyOn(agentPolicySvcMock, 'fetchAllAgentPolicies').mockReturnValue([] as any);

    const pw = new PolicyWatcher(soStartMock, logger);

    // emulate a license change below paid tier
    await pw.watch(Platinum);

    expect(logger.info).toHaveBeenLastCalledWith(
      'All agent policies are compliant, nothing to do!'
    );
  });

  it('should bulk update policies that are not compliant', async () => {
    const getMockAgentPolicyFetchAllAgentPolicies = (items: AgentPolicy[]) =>
      jest.fn(async function* (soClient: SavedObjectsClientContract) {
        const chunkSize = 1000; // Emulate paginated response
        for (let i = 0; i < items.length; i += chunkSize) {
          yield items.slice(i, i + chunkSize);
        }
      });

    const policiesToUpdate = Array.from({ length: 2001 }, (_, i) =>
      createAgentPolicyMock({ id: `policy${i}`, is_protected: true })
    );

    const updatedSOs = policiesToUpdate.map((policy) => createPolicySO(policy.id, false));

    agentPolicySvcMock.fetchAllAgentPolicies = getMockAgentPolicyFetchAllAgentPolicies([
      createAgentPolicyMock(),
      ...policiesToUpdate,
    ]); // Add one policy that should not be updated

    const pw = new PolicyWatcher(soStartMock, logger);

    // Mock paginated responses

    soClientMock.bulkUpdate.mockResolvedValueOnce({
      saved_objects: updatedSOs.slice(0, 1000),
    });
    soClientMock.bulkUpdate.mockResolvedValueOnce({
      saved_objects: updatedSOs.slice(1000, 2000),
    });
    soClientMock.bulkUpdate.mockResolvedValueOnce({
      saved_objects: updatedSOs.slice(2000),
    });

    // emulate a license change below paid tier
    await pw.watch(Basic);

    // 3 calls to bulkUpdate, 2001 policies to update, 1000 per call
    expect(soClientMock.bulkUpdate.mock.calls[0][0]).toHaveLength(999); // First fetched policy should not be updated due to is_protected: false
    expect(soClientMock.bulkUpdate.mock.calls[1][0]).toHaveLength(1000);
    expect(soClientMock.bulkUpdate.mock.calls[2][0]).toHaveLength(2);

    expect(soClientMock.bulkUpdate).toHaveBeenCalledTimes(3);

    expect(soClientMock.bulkUpdate).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'policy1',
          attributes: expect.objectContaining({ is_protected: false }),
        }),
      ])
    );

    expect(logger.info).toHaveBeenLastCalledWith(
      'Done - 2001 out of 2001 were successful. No errors encountered.'
    );
  });

  it('should return failed policies if bulk update fails', async () => {
    const getMockAgentPolicyFetchAllAgentPolicies = (items: AgentPolicy[]) =>
      jest.fn(async function* (soClient: SavedObjectsClientContract) {
        yield items;
      });

    agentPolicySvcMock.fetchAllAgentPolicies = getMockAgentPolicyFetchAllAgentPolicies([
      createAgentPolicyMock({ is_protected: true }),
      createAgentPolicyMock({ is_protected: true }),
    ]);

    const pw = new PolicyWatcher(soStartMock, logger);

    soClientMock.bulkUpdate.mockResolvedValue({
      saved_objects: [
        createPolicySO('agent-policy-1', false),
        createPolicySO('agent-policy-2', false, {
          error: 'error',
          statusCode: 500,
          message: 'error-test',
        }),
      ],
    });

    await pw.watch(Basic);

    expect(logger.error).toHaveBeenLastCalledWith(
      'Done - 1 out of 2 were unsuccessful. Errors encountered:\n' +
        'Policy [agent-policy-2] failed to update due to error: error-test'
    );
  });
});
