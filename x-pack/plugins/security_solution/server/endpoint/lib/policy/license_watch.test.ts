/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Subject } from 'rxjs';
import {
  elasticsearchServiceMock,
  loggingSystemMock,
  savedObjectsServiceMock,
} from '@kbn/core/server/mocks';
import { LicenseService } from '../../../../common/license';
import { createPackagePolicyServiceMock } from '@kbn/fleet-plugin/server/mocks';
import { PolicyWatcher } from './license_watch';
import { ILicense } from '@kbn/licensing-plugin/common/types';
import { licenseMock } from '@kbn/licensing-plugin/common/licensing.mock';
import { PackagePolicyServiceInterface } from '@kbn/fleet-plugin/server';
import { PackagePolicy } from '@kbn/fleet-plugin/common';
import { createPackagePolicyMock } from '@kbn/fleet-plugin/common/mocks';
import { policyFactory } from '../../../../common/endpoint/models/policy_config';
import { PolicyConfig } from '../../../../common/endpoint/types';

const MockPPWithEndpointPolicy = (cb?: (p: PolicyConfig) => PolicyConfig): PackagePolicy => {
  const packagePolicy = createPackagePolicyMock();
  if (!cb) {
    // eslint-disable-next-line no-param-reassign
    cb = (p) => p;
  }
  const policyConfig = cb(policyFactory());
  packagePolicy.inputs[0].config = { policy: { value: policyConfig } };
  return packagePolicy;
};

describe('Policy-Changing license watcher', () => {
  const logger = loggingSystemMock.create().get('license_watch.test');
  const soStartMock = savedObjectsServiceMock.createStartContract();
  const esStartMock = elasticsearchServiceMock.createStart();
  let packagePolicySvcMock: jest.Mocked<PackagePolicyServiceInterface>;

  const Platinum = licenseMock.createLicense({ license: { type: 'platinum', mode: 'platinum' } });
  const Gold = licenseMock.createLicense({ license: { type: 'gold', mode: 'gold' } });
  const Basic = licenseMock.createLicense({ license: { type: 'basic', mode: 'basic' } });

  beforeEach(() => {
    packagePolicySvcMock = createPackagePolicyServiceMock();
  });

  it('is activated on license changes', () => {
    // mock a license-changing service to test reactivity
    const licenseEmitter: Subject<ILicense> = new Subject();
    const licenseService = new LicenseService();
    const pw = new PolicyWatcher(packagePolicySvcMock, soStartMock, esStartMock, logger);

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

  it('pages through all endpoint policies', async () => {
    const TOTAL = 247;

    // set up the mocked package policy service to return and do what we want
    packagePolicySvcMock.list
      .mockResolvedValueOnce({
        items: Array.from({ length: 100 }, () => MockPPWithEndpointPolicy()),
        total: TOTAL,
        page: 1,
        perPage: 100,
      })
      .mockResolvedValueOnce({
        items: Array.from({ length: 100 }, () => MockPPWithEndpointPolicy()),
        total: TOTAL,
        page: 2,
        perPage: 100,
      })
      .mockResolvedValueOnce({
        items: Array.from({ length: TOTAL - 200 }, () => MockPPWithEndpointPolicy()),
        total: TOTAL,
        page: 3,
        perPage: 100,
      });

    const pw = new PolicyWatcher(packagePolicySvcMock, soStartMock, esStartMock, logger);
    await pw.watch(Gold); // just manually trigger with a given license

    expect(packagePolicySvcMock.list.mock.calls.length).toBe(3); // should have asked for 3 pages of resuts

    // Assert: on the first call to packagePolicy.list, we asked for page 1
    expect(packagePolicySvcMock.list.mock.calls[0][1].page).toBe(1);
    expect(packagePolicySvcMock.list.mock.calls[1][1].page).toBe(2); // second call, asked for page 2
    expect(packagePolicySvcMock.list.mock.calls[2][1].page).toBe(3); // etc
  });

  it('alters no-longer-licensed features', async () => {
    const CustomMessage = 'Custom string';

    // mock a Policy with a higher-tiered feature enabled
    packagePolicySvcMock.list.mockResolvedValueOnce({
      items: [
        MockPPWithEndpointPolicy((pc: PolicyConfig): PolicyConfig => {
          pc.windows.popup.malware.message = CustomMessage;
          return pc;
        }),
      ],
      total: 1,
      page: 1,
      perPage: 100,
    });

    const pw = new PolicyWatcher(packagePolicySvcMock, soStartMock, esStartMock, logger);

    // emulate a license change below paid tier
    await pw.watch(Basic);

    expect(packagePolicySvcMock.update).toHaveBeenCalled();
    expect(
      packagePolicySvcMock.update.mock.calls[0][3].inputs[0].config?.policy.value.windows.popup
        .malware.message
    ).not.toEqual(CustomMessage);
  });
});
