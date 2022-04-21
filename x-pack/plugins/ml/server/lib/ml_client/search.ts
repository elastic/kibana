/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { IScopedClusterClient } from '@kbn/core/server';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type {
  TransportResult,
  TransportRequestOptions,
  TransportRequestOptionsWithMeta,
  TransportRequestOptionsWithOutMeta,
} from '@elastic/elasticsearch';

import { MLSavedObjectService } from '../../saved_objects';
import { ML_RESULTS_INDEX_PATTERN } from '../../../common/constants/index_patterns';
import type { JobType } from '../../../common/types/saved_objects';

export function searchProvider(
  client: IScopedClusterClient,
  mlSavedObjectService: MLSavedObjectService
) {
  async function jobIdsCheck(jobType: JobType, jobIds: string[]) {
    if (jobIds.length) {
      const filteredJobIds = await mlSavedObjectService.filterJobIdsForSpace(jobType, jobIds);
      const missingIds = jobIds.filter((j) => filteredJobIds.indexOf(j) === -1);
      if (missingIds.length) {
        throw Boom.notFound(`${missingIds.join(',')} missing`);
      }
    }
  }

  async function anomalySearch<T>(
    searchParams: estypes.SearchRequest,
    jobIds: string[],
    options?: TransportRequestOptionsWithOutMeta
  ): Promise<estypes.SearchResponse<T>>;
  async function anomalySearch<T>(
    searchParams: estypes.SearchRequest,
    jobIds: string[],
    options?: TransportRequestOptionsWithMeta
  ): Promise<TransportResult<estypes.SearchResponse<T>>>;
  async function anomalySearch<T>(
    searchParams: estypes.SearchRequest,
    jobIds: string[],
    options?: TransportRequestOptions
  ): Promise<estypes.SearchResponse<T>>;
  async function anomalySearch<T>(
    searchParams: estypes.SearchRequest,
    jobIds: string[],
    options?: TransportRequestOptions
  ): Promise<TransportResult<estypes.SearchResponse<T>, unknown> | estypes.SearchResponse<T>> {
    await jobIdsCheck('anomaly-detector', jobIds);
    const { asInternalUser } = client;
    const resp = await asInternalUser.search<T>(
      {
        ...searchParams,
        index: ML_RESULTS_INDEX_PATTERN,
      },
      options
    );
    return resp;
  }

  return { anomalySearch };
}
