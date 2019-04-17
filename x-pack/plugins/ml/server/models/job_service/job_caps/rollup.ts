/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Request } from 'src/legacy/server/kbn_server';
import { SavedObject } from 'src/legacy/server/saved_objects/service/saved_objects_client';
import { CallWithRequestType } from '../../../client/elasticsearch_ml';

export interface RollupJob {
  job_id: string;
  rollup_index: string;
  index_pattern: string;
  fields: { [id: string]: [{ [id: string]: string }] };
}

export async function getRollupJob(
  indexPattern: string,
  callWithRequest: CallWithRequestType,
  request: Request
): Promise<RollupJob | null> {
  const savedObject = await loadRollupIndexPattern(indexPattern, request);

  if (savedObject !== null) {
    const parsedTypeMetaData = JSON.parse(savedObject.attributes.typeMeta);
    const rollUpIndex: string = parsedTypeMetaData.params.rollup_index;
    const resp = await callWithRequest('ml.rollupIndexCapabilities', { indexPattern: rollUpIndex });

    if (resp[rollUpIndex] && resp[rollUpIndex].rollup_jobs) {
      const rollupJobs: RollupJob[] = resp[rollUpIndex].rollup_jobs;
      const job = rollupJobs.find(j => j.job_id === rollUpIndex);
      if (job !== undefined) {
        return job;
      }
    }
  }

  return null;
}

async function loadRollupIndexPattern(
  indexPattern: string,
  request: Request
): Promise<SavedObject | null> {
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
