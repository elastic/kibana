/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import sinon from 'sinon';
import {
  createCollectorFetch,
  getCloudUsageCollector,
  KibanaHapiServer,
  parseEsUUID,
} from './get_cloud_usage_collector';

const CLOUD_ID_STAGING =
  'staging:dXMtZWFzdC0xLmF3cy5mb3VuZC5pbyRjZWM2ZjI2MWE3NGJmMjRjZTMzYmI4ODExYjg0Mjk0ZiRjNmMyY2E2ZDA0MjI0OWFmMGNjN2Q3YTllOTYyNTc0Mw==';
const CLOUD_ID =
  'dXMtZWFzdC0xLmF3cy5mb3VuZC5pbyRjZWM2ZjI2MWE3NGJmMjRjZTMzYmI4ODExYjg0Mjk0ZiRjNmMyY2E2ZDA0MjI0OWFmMGNjN2Q3YTllOTYyNTc0Mw==';
const ES_UUID = 'cec6f261a74bf24ce33bb8811b84294f';

const getMockServer = (cloudId?: string) => ({
  usage: { collectorSet: { makeUsageCollector: sinon.stub() } },
  config() {
    return {
      get(path: string) {
        switch (path) {
          case 'xpack.cloud':
            return { id: cloudId };
          default:
            throw Error(`server.config().get(${path}) should not be called by this collector.`);
        }
      },
    };
  },
});

describe('parseEsUUID', () => {
  it('returns elasticsearch cluster uuid from cloudID', () => {
    const esUUID = parseEsUUID(CLOUD_ID);
    expect(esUUID).toEqual(ES_UUID);
  });
  it('returns `undefined` on malformed cloudID', () => {
    const malformedID = Buffer.from('malformed id').toString('base64');
    const esUUID = parseEsUUID(malformedID);
    expect(esUUID).toEqual(undefined);
  });
  it('returns elasticsearch cluster uuid from cloudID with prepended friendly name', () => {
    const esUUID = parseEsUUID(CLOUD_ID_STAGING);
    expect(esUUID).toEqual(ES_UUID);
  });
  it('returns `undefined` if no cloudID is passed', () => {
    const esUUID = parseEsUUID();
    expect(esUUID).toEqual(undefined);
  });
});

describe('Cloud usage collector', () => {
  describe('collector', () => {
    it('returns `isCloudEnabled: false` if `xpack.cloud.id` is not defined', async () => {
      const collector = await createCollectorFetch(getMockServer())();
      expect(collector.isCloudEnabled).toBe(false);
    });

    it('returns `isCloudEnabled: true` if `xpack.cloud.id` is defined', async () => {
      const collector = await createCollectorFetch(getMockServer(CLOUD_ID))();
      expect(collector.isCloudEnabled).toBe(true);
    });

    it('returns `xpack.cloud.id` if available as `cloudID`', async () => {
      const withCloudID = await createCollectorFetch(getMockServer(CLOUD_ID))();
      const withoutCloudID = await createCollectorFetch(getMockServer())();
      expect(withCloudID.cloudID).toEqual(CLOUD_ID);
      expect(withoutCloudID.cloudID).toEqual(undefined);
    });

    it('returns elasticsearch cluster uuid', async () => {
      const usageStats = await createCollectorFetch(getMockServer(CLOUD_ID))();
      expect(usageStats.esUUID).toEqual(ES_UUID);
    });
  });
});

describe('getCloudUsageCollector', () => {
  it('returns calls `collectorSet.makeUsageCollector`', () => {
    const mockServer = getMockServer();
    getCloudUsageCollector((mockServer as any) as KibanaHapiServer);
    const { makeUsageCollector } = mockServer.usage.collectorSet;
    expect(makeUsageCollector.calledOnce).toBe(true);
  });
});
