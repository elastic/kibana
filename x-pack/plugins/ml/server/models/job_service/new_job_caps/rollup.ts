/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { IScopedClusterClient } from 'kibana/server';
import type {
  DataViewsService,
  DataView,
} from '../../../../../../../src/plugins/data_views/common';
import type { RollupFields } from '../../../../common/types/fields';

export interface RollupJob {
  job_id: string;
  rollup_index: string;
  index_pattern: string;
  fields: RollupFields;
}

export async function rollupServiceProvider(
  indexPattern: string,
  { asCurrentUser }: IScopedClusterClient,
  dataViewsService: DataViewsService
) {
  const rollupIndexPatternObject = await loadRollupIndexPattern(indexPattern, dataViewsService);
  let jobIndexPatterns: string[] = [indexPattern];

  async function getRollupJobs(): Promise<
    estypes.RollupGetRollupCapsRollupCapabilitySummary[] | null
  > {
    if (
      rollupIndexPatternObject !== null &&
      rollupIndexPatternObject.typeMeta?.params !== undefined
    ) {
      const rollUpIndex: string = rollupIndexPatternObject.typeMeta.params.rollup_index;
      const rollupCaps = await asCurrentUser.rollup.getRollupIndexCaps({
        index: rollUpIndex,
      });

      const indexRollupCaps = rollupCaps[rollUpIndex];
      if (indexRollupCaps && indexRollupCaps.rollup_jobs) {
        jobIndexPatterns = indexRollupCaps.rollup_jobs.map((j) => j.index_pattern);

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
  dataViewsService: DataViewsService
): Promise<DataView | null> {
  const resp = await dataViewsService.find('*', 10000);
  const obj = resp.find(
    (dv) => dv.type === 'rollup' && dv.title === indexPattern && dv.typeMeta !== undefined
  );

  return obj ?? null;
}
