/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  elasticsearchServiceMock,
  loggingSystemMock,
  savedObjectsServiceMock,
} from '@kbn/core/server/mocks';
import { licenseMock } from '@kbn/licensing-plugin/common/licensing.mock';
import type { ILicense } from '@kbn/licensing-plugin/common/types';
import { Subject } from 'rxjs';

import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';

import type { AgentPolicy } from '../../common';

import { LicenseService } from '../../common/services';

import { createAgentPolicyMock } from '../../common/mocks';

import { PolicyWatcher } from './agent_policy_watch';
import { agentPolicyService } from './agent_policy';

jest.mock('./agent_policy');
const agentPolicySvcMock = agentPolicyService as jest.Mocked<typeof agentPolicyService>;

describe('Agent Policy-Changing license watcher', () => {
  const logger = loggingSystemMock.create().get('license_watch.test');
  const soStartMock = savedObjectsServiceMock.createStartContract();
  const esStartMock = elasticsearchServiceMock.createStart();

  const Platinum = licenseMock.createLicense({ license: { type: 'platinum', mode: 'platinum' } });
  const Basic = licenseMock.createLicense({ license: { type: 'basic', mode: 'basic' } });

  it('is activated on license changes', () => {
    // mock a license-changing service to test reactivity
    const licenseEmitter: Subject<ILicense> = new Subject();
    const licenseService = new LicenseService();
    const pw = new PolicyWatcher(soStartMock, esStartMock, logger);

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

  it('alters no-longer-licensed features', async () => {
    const getMockAgentPolicyFetchAllAgentPolicies = (items: AgentPolicy[]) =>
      jest.fn(async function* (soClient: SavedObjectsClientContract) {
        yield items;
      });

    agentPolicySvcMock.fetchAllAgentPolicies = getMockAgentPolicyFetchAllAgentPolicies([
      createAgentPolicyMock({ is_protected: true }),
    ]);

    const pw = new PolicyWatcher(soStartMock, esStartMock, logger);

    // emulate a license change below paid tier
    await pw.watch(Basic);

    expect(agentPolicySvcMock.update).toHaveBeenCalled();
    expect(agentPolicySvcMock.update.mock.calls[0][3].is_protected).toEqual(false);
  });
});
