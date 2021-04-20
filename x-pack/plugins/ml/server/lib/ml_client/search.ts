/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { IScopedClusterClient } from 'kibana/server';
import { estypes, ApiResponse } from '@elastic/elasticsearch';

import { JobSavedObjectService } from '../../saved_objects';
import { ML_RESULTS_INDEX_PATTERN } from '../../../common/constants/index_patterns';
import type { JobType } from '../../../common/types/saved_objects';

export function searchProvider(
  client: IScopedClusterClient,
  jobSavedObjectService: JobSavedObjectService
) {
  async function jobIdsCheck(jobType: JobType, jobIds: string[]) {
    if (jobIds.length) {
      const filteredJobIds = await jobSavedObjectService.filterJobIdsForSpace(jobType, jobIds);
      const missingIds = jobIds.filter((j) => filteredJobIds.indexOf(j) === -1);
      if (missingIds.length) {
        throw Boom.notFound(`${missingIds.join(',')} missing`);
      }
    }
  }

  async function anomalySearch<T>(
    searchParams: estypes.SearchRequest,
    jobIds: string[]
  ): Promise<ApiResponse<estypes.SearchResponse<T>>> {
    await jobIdsCheck('anomaly-detector', jobIds);
    const { asInternalUser } = client;
    const resp = await asInternalUser.search<T>({
      ...searchParams,
      index: ML_RESULTS_INDEX_PATTERN,
    });
    return resp;
  }
  return { anomalySearch };
}
