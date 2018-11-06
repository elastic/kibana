/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { BackendFrameworkAdapter } from '../adapter_types';

interface ContractConfig {
  before?(): Promise<void>;
  after?(): Promise<void>;
  adapterSetup(): BackendFrameworkAdapter;
}

export const contractTests = (testName: string, config: ContractConfig) => {
  describe.skip(testName, () => {
    let frameworkAdapter: BackendFrameworkAdapter;
    beforeAll(async () => {
      jest.setTimeout(100000); // 1 second

      if (config.before) {
        await config.before();
      }
    });
    afterAll(async () => config.after && (await config.after()));
    beforeEach(async () => {
      // FIXME: one of these always should exist, type ContractConfig as such
      frameworkAdapter = config.adapterSetup();
    });

    it('Should call callback when plugin is green', () => {
      const greenCallback = jest.fn();

      frameworkAdapter.on('xpack.status.green', greenCallback);
      expect(greenCallback).toBeCalled();
    });

    it('Should return settings from Kibana', () => {
      const encryptionKey = frameworkAdapter.getSetting('xpack.beats.encryptionKey');
      expect(encryptionKey).toEqual('xpack_beats_default_encryptionKey');

      const enrollmentTokensTtlInSeconds = frameworkAdapter.getSetting(
        'xpack.beats.enrollmentTokensTtlInSeconds'
      );
      expect(enrollmentTokensTtlInSeconds).toEqual(600);
    });
    it('Should return current Kibana version', () => {
      expect(frameworkAdapter.info!.kibana.version).not.toEqual(undefined);
    });
    it('Should return current license', () => {
      expect(frameworkAdapter.info!.license.type).toEqual('trial');
    });
    it('Should return current license status', () => {
      expect(frameworkAdapter.info!.license.expired).toEqual(false);
    });
    it('Should return security status', () => {
      expect(frameworkAdapter.info!.security.enabled).toEqual(true);
    });
  });
};
