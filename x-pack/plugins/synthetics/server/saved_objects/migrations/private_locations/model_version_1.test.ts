/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { transformGeoProperty } from './model_version_1';
import { privateLocationsSavedObjectName } from '../../../../common/saved_objects/private_locations';

describe('model version 1 migration', () => {
  const testLocation = {
    label: 'us-east-1',
    id: 'us-east-1',
    geo: {
      lat: '40.7128',
      lon: '-74.0060',
    },
    agentPolicyId: 'agentPolicyId',
    concurrentMonitors: 1,
  };
  const testObject = {
    type: privateLocationsSavedObjectName,
    id: 'synthetics-privates-locations-singleton',
    attributes: {
      locations: [testLocation],
    },
  };
  it('should return expected result', function () {
    const result = transformGeoProperty(testObject, {} as any);
    expect(result.document).toEqual({
      attributes: {
        locations: [
          {
            agentPolicyId: 'agentPolicyId',
            concurrentMonitors: 1,
            geo: {
              lat: 40.7128,
              lon: -74.006,
            },
            id: 'us-east-1',
            isServiceManaged: false,
            label: 'us-east-1',
          },
        ],
      },
      id: 'synthetics-privates-locations-singleton',
      type: 'synthetics-privates-locations',
    });
  });

  it('should return expected result for zero values', function () {
    testLocation.geo.lat = '0';
    testLocation.geo.lon = '0';
    const result = transformGeoProperty(testObject, {} as any);
    expect(result.document).toEqual({
      attributes: {
        locations: [
          {
            agentPolicyId: 'agentPolicyId',
            concurrentMonitors: 1,
            geo: {
              lat: 0,
              lon: 0,
            },
            id: 'us-east-1',
            isServiceManaged: false,
            label: 'us-east-1',
          },
        ],
      },
      id: 'synthetics-privates-locations-singleton',
      type: 'synthetics-privates-locations',
    });
  });

  it('should return expected result for zero integers', function () {
    // @ts-ignore
    testLocation.geo.lat = 0;
    // @ts-ignore
    testLocation.geo.lon = 0;
    const result = transformGeoProperty(testObject, {} as any);
    expect(result.document).toEqual({
      attributes: {
        locations: [
          {
            agentPolicyId: 'agentPolicyId',
            concurrentMonitors: 1,
            geo: {
              lat: 0,
              lon: 0,
            },
            id: 'us-east-1',
            isServiceManaged: false,
            label: 'us-east-1',
          },
        ],
      },
      id: 'synthetics-privates-locations-singleton',
      type: 'synthetics-privates-locations',
    });
  });

  it('should return expected result for empty values', function () {
    // @ts-ignore
    testLocation.geo.lat = '';
    // @ts-ignore
    testLocation.geo.lon = '';
    const result = transformGeoProperty(testObject, {} as any);
    expect(result.document).toEqual({
      attributes: {
        locations: [
          {
            agentPolicyId: 'agentPolicyId',
            concurrentMonitors: 1,
            geo: {
              lat: 0,
              lon: 0,
            },
            id: 'us-east-1',
            isServiceManaged: false,
            label: 'us-east-1',
          },
        ],
      },
      id: 'synthetics-privates-locations-singleton',
      type: 'synthetics-privates-locations',
    });
  });
  it('should return expected result for null values', function () {
    // @ts-ignore
    testLocation.geo.lat = null;
    // @ts-ignore
    testLocation.geo.lon = null;
    const result = transformGeoProperty(testObject, {} as any);
    expect(result.document).toEqual({
      attributes: {
        locations: [
          {
            agentPolicyId: 'agentPolicyId',
            concurrentMonitors: 1,
            geo: {
              lat: 0,
              lon: 0,
            },
            id: 'us-east-1',
            isServiceManaged: false,
            label: 'us-east-1',
          },
        ],
      },
      id: 'synthetics-privates-locations-singleton',
      type: 'synthetics-privates-locations',
    });
  });

  it('should return expected result for undefined values', function () {
    // @ts-ignore
    testLocation.geo = undefined;
    const result = transformGeoProperty(testObject, {} as any);
    expect(result.document).toEqual({
      attributes: {
        locations: [
          {
            agentPolicyId: 'agentPolicyId',
            concurrentMonitors: 1,
            geo: {
              lat: 0,
              lon: 0,
            },
            id: 'us-east-1',
            isServiceManaged: false,
            label: 'us-east-1',
          },
        ],
      },
      id: 'synthetics-privates-locations-singleton',
      type: 'synthetics-privates-locations',
    });
  });
});
