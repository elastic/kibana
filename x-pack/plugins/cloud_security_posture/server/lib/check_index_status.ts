/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, type Logger } from '@kbn/core/server';
import type { IndexStatus } from '@kbn/cloud-security-posture-common';
import { getSafePostureTypeRuntimeMapping } from '../../common/runtime_mappings/get_safe_posture_type_runtime_mapping';
import { PostureTypes } from '../../common/types_old';

export interface PostureTypeAndRetention {
  postureType?: PostureTypes;
  retentionTime?: string;
}

export const checkIndexStatus = async (
  esClient: ElasticsearchClient,
  index: string,
  logger: Logger,
  PostureTypeAndRetention?: PostureTypeAndRetention
): Promise<IndexStatus> => {
  const isNotKspmOrCspm =
    !PostureTypeAndRetention?.postureType ||
    PostureTypeAndRetention?.postureType === 'all' ||
    PostureTypeAndRetention?.postureType === 'vuln_mgmt';

  const query = {
    bool: {
      filter: [
        ...(isNotKspmOrCspm
          ? []
          : [
              {
                term: {
                  safe_posture_type: PostureTypeAndRetention?.postureType,
                },
              },
            ]),
        {
          range: {
            '@timestamp': {
              gte: `now-${PostureTypeAndRetention?.retentionTime}`,
              lte: 'now',
            },
          },
        },
      ],
    },
  };
  try {
    const queryResult = await esClient.search({
      index,
      runtime_mappings: {
        ...getSafePostureTypeRuntimeMapping(),
      },
      query,
      size: 1,
    });
    return queryResult.hits.hits.length ? 'not-empty' : 'empty';
  } catch (e) {
    logger.debug(e);
    if (e?.meta?.body?.error?.type === 'security_exception') {
      return 'unprivileged';
    }

    // Assuming index doesn't exist
    return 'empty';
  }
};
