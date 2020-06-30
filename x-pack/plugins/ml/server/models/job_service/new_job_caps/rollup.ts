/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObject } from 'kibana/server';
import { IndexPatternAttributes } from 'src/plugins/data/server';
import { SavedObjectsClientContract } from 'kibana/server';
import { FieldId } from '../../../../common/types/fields';
import { ES_AGGREGATION } from '../../../../common/constants/aggregation_types';

export type RollupFields = Record<FieldId, [Record<'agg', ES_AGGREGATION>]>;

export interface RollupJob {
  job_id: string;
  rollup_index: string;
  index_pattern: string;
  fields: RollupFields;
}

export async function rollupServiceProvider(
  indexPattern: string,
  callWithRequest: any,
  savedObjectsClient: SavedObjectsClientContract
) {
  const rollupIndexPatternObject = await loadRollupIndexPattern(indexPattern, savedObjectsClient);
  let jobIndexPatterns: string[] = [indexPattern];

  async function getRollupJobs(): Promise<RollupJob[] | null> {
    if (rollupIndexPatternObject !== null) {
      const parsedTypeMetaData = JSON.parse(rollupIndexPatternObject.attributes.typeMeta);
      const rollUpIndex: string = parsedTypeMetaData.params.rollup_index;
      const rollupCaps = await callWithRequest('ml.rollupIndexCapabilities', {
        indexPattern: rollUpIndex,
      });

      const indexRollupCaps = rollupCaps[rollUpIndex];
      if (indexRollupCaps && indexRollupCaps.rollup_jobs) {
        jobIndexPatterns = indexRollupCaps.rollup_jobs.map((j: RollupJob) => j.index_pattern);

        return indexRollupCaps.rollup_jobs;
      }
    }

    return null;
  }

  function getIndexPattern() {
    return jobIndexPatterns.join(',');
  }

  return {
    getRollupJobs,
    getIndexPattern,
  };
}

async function loadRollupIndexPattern(
  indexPattern: string,
  savedObjectsClient: SavedObjectsClientContract
): Promise<SavedObject<IndexPatternAttributes> | null> {
  const resp = await savedObjectsClient.find<IndexPatternAttributes>({
    type: 'index-pattern',
    fields: ['title', 'type', 'typeMeta'],
    perPage: 1000,
  });

  const obj = resp.saved_objects.find(
    (r) =>
      r.attributes &&
      r.attributes.type === 'rollup' &&
      r.attributes.title === indexPattern &&
      r.attributes.typeMeta !== undefined
  );

  return obj || null;
}
