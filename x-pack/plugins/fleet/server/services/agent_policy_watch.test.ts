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
  const Gold = licenseMock.createLicense({ license: { type: 'gold', mode: 'gold' } });
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

  it('pages through all agent policies', async () => {
    const TOTAL = 247;

    // set up the mocked agent policy service to return and do what we want
    agentPolicySvcMock.list
      .mockResolvedValueOnce({
        items: Array.from({ length: 100 }, () => createAgentPolicyMock()),
        total: TOTAL,
        page: 1,
        perPage: 100,
      })
      .mockResolvedValueOnce({
        items: Array.from({ length: 100 }, () => createAgentPolicyMock()),
        total: TOTAL,
        page: 2,
        perPage: 100,
      })
      .mockResolvedValueOnce({
        items: Array.from({ length: TOTAL - 200 }, () => createAgentPolicyMock()),
        total: TOTAL,
        page: 3,
        perPage: 100,
      });

    const pw = new PolicyWatcher(soStartMock, esStartMock, logger);
    await pw.watch(Gold); // just manually trigger with a given license

    expect(agentPolicySvcMock.list.mock.calls.length).toBe(3); // should have asked for 3 pages of resuts

    // Assert: on the first call to agentPolicy.list, we asked for page 1
    expect(agentPolicySvcMock.list.mock.calls[0][1].page).toBe(1);
    expect(agentPolicySvcMock.list.mock.calls[1][1].page).toBe(2); // second call, asked for page 2
    expect(agentPolicySvcMock.list.mock.calls[2][1].page).toBe(3); // etc
  });

  it('alters no-longer-licensed features', async () => {
    // mock an agent policy with agent tamper protection enabled
    agentPolicySvcMock.list.mockResolvedValueOnce({
      items: [createAgentPolicyMock({ is_protected: true })],
      total: 1,
      page: 1,
      perPage: 100,
    });

    const pw = new PolicyWatcher(soStartMock, esStartMock, logger);

    // emulate a license change below paid tier
    await pw.watch(Basic);

    expect(agentPolicySvcMock.update).toHaveBeenCalled();
    expect(agentPolicySvcMock.update.mock.calls[0][3].is_protected).toEqual(false);
  });
});
