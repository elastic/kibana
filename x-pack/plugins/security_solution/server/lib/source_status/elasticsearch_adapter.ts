/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FrameworkAdapter, FrameworkRequest } from '../framework';
import { SourceStatusAdapter } from './index';
import { buildQuery } from './query.dsl';
import { ApmServiceNameAgg } from './types';
import { ENDPOINT_METADATA_INDEX } from '../../../common/constants';

const APM_INDEX_NAME = 'apm-*-transaction*';

export class ElasticsearchSourceStatusAdapter implements SourceStatusAdapter {
  constructor(private readonly framework: FrameworkAdapter) {}

  public async hasIndices(request: FrameworkRequest, indexNames: string[]) {
    // Intended flow to determine app-empty state is to first check siem indices (as this is a quick shard count), and
    // if no shards exist only then perform the heavier APM query. This optimizes for normal use when siem data exists
    try {
      // Add endpoint metadata index to indices to check
      indexNames.push(ENDPOINT_METADATA_INDEX);
      // Remove APM index if exists, and only query if length > 0 in case it's the only index provided
      const nonApmIndexNames = indexNames.filter((name) => name !== APM_INDEX_NAME);
      const indexCheckResponse = await (nonApmIndexNames.length > 0
        ? this.framework.callWithRequest(request, 'search', {
            index: nonApmIndexNames,
            size: 0,
            terminate_after: 1,
            allow_no_indices: true,
          })
        : Promise.resolve(undefined));

      if ((indexCheckResponse?._shards.total ?? -1) > 0) {
        return true;
      }

      // Note: Additional check necessary for APM-specific index. For details see: https://github.com/elastic/kibana/issues/56363
      // Only verify if APM data exists if indexNames includes `apm-*-transaction*` (default included apm index)
      const includesApmIndex = indexNames.includes(APM_INDEX_NAME);
      const hasApmDataResponse = await (includesApmIndex
        ? this.framework.callWithRequest<{}, ApmServiceNameAgg>(
            request,
            'search',
            buildQuery({ defaultIndex: [APM_INDEX_NAME] })
          )
        : Promise.resolve(undefined));

      if ((hasApmDataResponse?.aggregations?.total_service_names?.value ?? -1) > 0) {
        return true;
      }
    } catch (e) {
      if (e.status === 404) {
        return false;
      }
      throw e;
    }

    return false;
  }
}
