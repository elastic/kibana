/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { fetchLicenseType } from './fetch_license_type';

describe('fetchLicenseType', () => {
  const clusterUuid = '1abcde2';
  const availableCcs: string[] = [];
  const callCluster = jest.fn().mockImplementation(() => ({
    hits: {
      hits: [
        {
          _source: {
            license: {
              type: 'trial',
            },
          },
        },
      ],
    },
  }));

  it('should get the license type', async () => {
    const result = await fetchLicenseType(callCluster, availableCcs, clusterUuid);
    expect(result).toStrictEqual('trial');
  });

  it('should handle no license data', async () => {
    const customCallCluster = jest.fn().mockImplementation(() => ({
      hits: {
        hits: [],
      },
    }));
    const result = await fetchLicenseType(customCallCluster, availableCcs, clusterUuid);
    expect(result).toStrictEqual(null);
  });
});
