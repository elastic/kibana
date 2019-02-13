/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { BackendFrameworkAdapter } from '../adapter_types';

interface ContractConfig {
  before(): Promise<void>;
  after(): Promise<void>;
  adapterSetup(): BackendFrameworkAdapter;
}

export const contractTests = (testName: string, config: ContractConfig) => {
  describe(testName, () => {
    let frameworkAdapter: any;
    beforeAll(config.before);
    afterAll(config.after);
    beforeEach(async () => {
      frameworkAdapter = config.adapterSetup();
    });

    it('Should intalize adapter without error', () => {
      expect(() => {
        config.adapterSetup();
      }).not.toThrow();
    });

    it('Should fire event on xpack green', done => {
      frameworkAdapter.on('xpack.status.green', () => {
        done();
      });
    });

    it('Should fire event on elasticsearch green', done => {
      frameworkAdapter.on('elasticsearch.status.green', () => {
        done();
      });
    });

    it('Should get settings from Kibana', () => {
      expect(frameworkAdapter.getSetting('xpack.beats.encryptionKey')).toMatchSnapshot(
        'encryptionKey'
      );
      expect(
        frameworkAdapter.getSetting('xpack.beats.enrollmentTokensTtlInSeconds')
      ).toMatchSnapshot('enrollmentTokensTtlInSeconds');

      expect(frameworkAdapter.getSetting('xpack.beats.defaultUserRoles')).toMatchSnapshot(
        'defaultUserRoles'
      );
    });

    it('Should log output without throwing errors', () => {
      // TODO we should realy be testing for this to work
      expect(() => {
        frameworkAdapter.log('test');
      }).not.toThrow();
    });

    it('Should have xpack info', () => {
      expect(frameworkAdapter.info).not.toEqual(null);
    });
  });
};
