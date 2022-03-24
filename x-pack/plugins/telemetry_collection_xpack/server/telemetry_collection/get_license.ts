/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { ElasticsearchClient } from 'src/core/server';

export type ESLicense = estypes.LicenseGetLicenseInformation;

let cachedLicense: ESLicense | undefined;

async function fetchLicense(esClient: ElasticsearchClient, local: boolean) {
  return await esClient.license.get({
    local,
  });
}

/**
 * Get the cluster's license from the connected node.
 *
 * This is the equivalent of GET /_license?local=true.
 *
 * Like any X-Pack related API, X-Pack must installed for this to work.
 *
 * In OSS we'll get a 400 response using the new elasticsearch client.
 */
export async function getLicenseFromLocalOrMaster(esClient: ElasticsearchClient) {
  // Fetching the local license is cheaper than getting it from the master node and good enough
  const { license } = await fetchLicense(esClient, true).catch(async (err) => {
    if (cachedLicense) {
      try {
        // Fallback to the master node's license info
        const response = await fetchLicense(esClient, false);
        return response;
      } catch (masterError) {
        if ([400, 404].includes(masterError.statusCode)) {
          // If the master node does not have a license, we can assume there is no license
          cachedLicense = undefined;
        } else {
          throw err;
        }
      }
    }
    return { license: void 0 };
  });

  if (license) {
    cachedLicense = license;
  }
  return license;
}
