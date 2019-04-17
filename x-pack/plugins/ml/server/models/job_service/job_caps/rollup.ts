/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Request } from 'src/legacy/server/kbn_server';

export interface RollupConfig {
  job_id: string;
  rollup_index: string;
  index_pattern: string;
  fields: { [id: string]: [{ [id: string]: string }] };
}

export async function getRollupConfig(
  indexPattern: string,
  callWithRequest: any,
  request: Request
): Promise<RollupConfig | null> {
  const rollupConfig = await loadRollupConfig(indexPattern, request);

  if (rollupConfig) {
    const parsedTypeMetaData = JSON.parse(rollupConfig.attributes.typeMeta);
    const rollUpIndex: string = parsedTypeMetaData.params.rollup_index;
    const resp = await callWithRequest('ml.rollupIndexCapabilities', { indexPattern: rollUpIndex });

    if (resp[rollUpIndex] && resp[rollUpIndex].rollup_jobs) {
      const rollupJobs: any[] = resp[rollUpIndex].rollup_jobs;
      const job = rollupJobs.find(j => j.job_id === rollUpIndex);
      if (job !== undefined) {
        return job;
      }
    }
  }

  return null;
}

async function loadRollupConfig(indexPattern: string, request: Request): Promise<any> {
  const savedObjectsClient = request.getSavedObjectsClient();
  const resp = await savedObjectsClient.find({
    type: 'index-pattern',
    fields: ['title', 'type', 'typeMeta'],
    perPage: 1000,
  });

  const obj = resp.saved_objects.find(
    r =>
      r.attributes &&
      r.attributes.type === 'rollup' &&
      r.attributes.title === indexPattern &&
      r.attributes.typeMeta !== undefined
  );

  return obj || null;
}
