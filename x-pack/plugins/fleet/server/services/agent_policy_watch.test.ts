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

import { AppFeatureSecurityKey } from '@kbn/security-solution-features/src/app_features_keys';

import { LicenseService } from '../../common/services';

import { createAgentPolicyMock } from '../../common/mocks';

import { PolicyWatcher } from './agent_policy_watch';
import { agentPolicyService } from './agent_policy';

jest.mock('./agent_policy');

const agentPolicySvcMock = agentPolicyService as jest.Mocked<typeof agentPolicyService>;

const createMockResponsePages = (
  total: number,
  perPage: number,
  overrideProps?: Record<string, unknown>
) => {
  let remainingTotal = total;
  return Array.from({ length: Math.ceil(total / perPage) }, (_, index) => {
    const itemsCount = Math.min(remainingTotal, perPage);
    remainingTotal -= itemsCount;
    return {
      items: Array.from({ length: itemsCount }, () => createAgentPolicyMock(overrideProps)),
      total,
      page: index + 1,
      perPage,
    };
  });
};

describe('Agent Policy Watch', () => {
  const logger = loggingSystemMock.create().get('license_watch.test');
  const soStartMock = savedObjectsServiceMock.createStartContract();
  const esStartMock = elasticsearchServiceMock.createStart();

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Agent Policy-Changing license watcher', () => {
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
      const [firstPage, secondPage, thirdPage] = createMockResponsePages(247, 100);

      // set up the mocked agent policy service to return and do what we want
      agentPolicySvcMock.list
        .mockResolvedValueOnce(firstPage)
        .mockResolvedValueOnce(secondPage)
        .mockResolvedValueOnce(thirdPage);

      const pw = new PolicyWatcher(soStartMock, esStartMock, logger);
      await pw.watch(Gold); // just manually trigger with a given license

      expect(agentPolicySvcMock.list.mock.calls.length).toBe(3); // should have asked for 3 pages of results

      // Assert: on the first call to agentPolicy.list, we asked for page 1
      expect(agentPolicySvcMock.list.mock.calls[0][1].page).toBe(1);
      expect(agentPolicySvcMock.list.mock.calls[1][1].page).toBe(2); // second call, asked for page 2
      expect(agentPolicySvcMock.list.mock.calls[2][1].page).toBe(3); // etc
    });

    it('alters no-longer-licensed features', async () => {
      const [singlePage] = createMockResponsePages(1, 100, {
        is_protected: true,
      });
      agentPolicySvcMock.list.mockResolvedValueOnce(singlePage);

      const pw = new PolicyWatcher(soStartMock, esStartMock, logger);

      // emulate a license change below paid tier
      await pw.watch(Basic);

      expect(agentPolicySvcMock.update).toHaveBeenCalled();
      expect(agentPolicySvcMock.update.mock.calls[0][3].is_protected).toEqual(false);
    });
  });
  describe('Agent Policy App Feature', () => {
    it('does nothing if app feature is enabled', async () => {
      const pw = new PolicyWatcher(soStartMock, esStartMock, logger);
      await pw.checkAppFeature(AppFeatureSecurityKey.endpointAgentTamperProtection, true);

      expect(agentPolicySvcMock.list.mock.calls.length).toBe(0);
      expect(agentPolicySvcMock.bumpRevision.mock.calls.length).toBe(0);
    });

    it('alters agent policy if app feature is disabled', async () => {
      const TOTAL = 2470;

      const [firstPage, secondPage, thirdPage] = createMockResponsePages(TOTAL, 1000, {
        is_protected: true,
      });

      agentPolicySvcMock.list
        .mockResolvedValueOnce(firstPage)
        .mockResolvedValueOnce(secondPage)
        .mockResolvedValueOnce(thirdPage);

      const pw = new PolicyWatcher(soStartMock, esStartMock, logger);
      await pw.checkAppFeature(AppFeatureSecurityKey.endpointAgentTamperProtection, false);

      expect(agentPolicySvcMock.list.mock.calls.length).toBe(3);
      expect(agentPolicySvcMock.bumpRevision.mock.calls.length).toBe(TOTAL);
      expect(agentPolicySvcMock.bumpRevision.mock.calls[0][3]).toHaveProperty(
        'removeProtection',
        true
      );
    });
  });
});
