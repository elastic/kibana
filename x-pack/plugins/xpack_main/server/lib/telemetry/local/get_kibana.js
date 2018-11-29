/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * Check user privileges for read access to monitoring
 * Pass callWithInternalUser to bulkFetchUsage
 */
export async function getKibana(server, callCluster) {
  const { collectorSet } = server.usage;
  const usage = await collectorSet.bulkFetchUsage(callCluster);
  return collectorSet.toObject(usage);
}
