/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Observable } from 'rxjs';
import _, { countBy, groupBy, mapValues } from 'lodash';
import { first } from 'rxjs/operators';

import { LegacyAPICaller, ILegacyClusterClient } from 'src/core/server';
import { getNextMidnight } from '../../get_next_midnight';
import { getPastDays } from '../../get_past_days';
import { TaskInstance } from '../../../../../task_manager/server';
import { ESSearchHit } from '../../../../../apm/typings/elasticsearch';

interface VisSummary {
  type: string;
  space: string;
  past_days: number;
}

/*
 * Parse the response data into telemetry payload
 */
async function getStats(callCluster: LegacyAPICaller, index: string) {
  const searchParams = {
    size: 10000, // elasticsearch index.max_result_window default value
    index,
    ignoreUnavailable: true,
    filterPath: [
      'hits.hits._id',
      'hits.hits._source.visualization',
      'hits.hits._source.updated_at',
    ],
    body: {
      query: {
        bool: { filter: { term: { type: 'visualization' } } },
      },
    },
  };
  const esResponse = await callCluster('search', searchParams);
  const size = _.get(esResponse, 'hits.hits.length') as number;
  if (size < 1) {
    return;
  }

  // `map` to get the raw types
  const visSummaries: VisSummary[] = esResponse.hits.hits.map(
    (hit: ESSearchHit<{ visState: string }>) => {
      const spacePhrases: string[] = hit._id.split(':');
      const lastUpdated: string = _.get(hit, '_source.updated_at');
      const space = spacePhrases.length === 3 ? spacePhrases[0] : 'default'; // if in a custom space, the format of a saved object ID is space:type:id
      const visualization = _.get(hit, '_source.visualization', { visState: '{}' });
      const visState: { type?: string } = JSON.parse(visualization.visState);
      return {
        type: visState.type || '_na_',
        space,
        past_days: getPastDays(lastUpdated),
      };
    }
  );

  // organize stats per type
  const visTypes = groupBy(visSummaries, 'type');

  // get the final result
  return mapValues(visTypes, (curr) => {
    const total = curr.length;
    const spacesBreakdown = countBy(curr, 'space');
    const spaceCounts: number[] = _.values(spacesBreakdown);

    return {
      total,
      spaces_min: _.min(spaceCounts),
      spaces_max: _.max(spaceCounts),
      spaces_avg: total / spaceCounts.length,
      saved_7_days_total: curr.filter((c) => c.past_days <= 7).length,
      saved_30_days_total: curr.filter((c) => c.past_days <= 30).length,
      saved_90_days_total: curr.filter((c) => c.past_days <= 90).length,
    };
  });
}

export function visualizationsTaskRunner(
  taskInstance: TaskInstance,
  config: Observable<{ kibana: { index: string } }>,
  esClientPromise: Promise<ILegacyClusterClient>
) {
  return async () => {
    let stats;
    let error;

    try {
      const index = (await config.pipe(first()).toPromise()).kibana.index;
      stats = await getStats((await esClientPromise).callAsInternalUser, index);
    } catch (err) {
      if (err.constructor === Error) {
        error = err.message;
      } else {
        error = err;
      }
    }

    return {
      runAt: getNextMidnight(),
      state: {
        runs: taskInstance.state.runs + 1,
        stats,
      },
      error,
    };
  };
}
