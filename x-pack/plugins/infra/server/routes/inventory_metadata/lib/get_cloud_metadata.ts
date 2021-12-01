/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TIMESTAMP_FIELD } from '../../../../common/constants';
import { InventoryCloudAccount } from '../../../../common/http_api/inventory_meta_api';
import {
  InfraMetadataAggregationResponse,
  InfraMetadataAggregationBucket,
} from '../../../lib/adapters/framework';
import { InfraSourceConfiguration } from '../../../lib/sources';
import { KibanaFramework } from '../../../lib/adapters/framework/kibana_framework_adapter';
import { InventoryItemType } from '../../../../common/inventory_models/types';
import { findInventoryModel } from '../../../../common/inventory_models';
import type { InfraPluginRequestHandlerContext } from '../../../types';

export interface CloudMetaData {
  accounts: InventoryCloudAccount[];
  projects: string[];
  regions: string[];
}

export const getCloudMetadata = async (
  framework: KibanaFramework,
  req: InfraPluginRequestHandlerContext,
  sourceConfiguration: InfraSourceConfiguration,
  nodeType: InventoryItemType,
  currentTime: number
): Promise<CloudMetaData> => {
  const model = findInventoryModel(nodeType);
  // Only run this for AWS modules, eventually we might have more.
  if (model.requiredModule !== 'aws') {
    return {
      accounts: [],
      projects: [],
      regions: [],
    };
  }

  const metricQuery = {
    allow_no_indices: true,
    ignore_unavailable: true,
    index: sourceConfiguration.metricAlias,
    body: {
      query: {
        bool: {
          must: [
            {
              range: {
                [TIMESTAMP_FIELD]: {
                  gte: currentTime - 86400000, // 24 hours ago
                  lte: currentTime,
                  format: 'epoch_millis',
                },
              },
            },
            { match: { 'event.module': model.requiredModule } },
          ],
        },
      },
      size: 0,
      aggs: {
        accounts: {
          terms: {
            field: 'cloud.account.id',
            size: 1000,
          },
          aggs: {
            accountNames: {
              terms: {
                field: 'cloud.account.name',
                size: 1000,
              },
            },
          },
        },
        regions: {
          terms: {
            field: 'cloud.region',
            size: 1000,
          },
        },
      },
    },
  };

  const response = await framework.callWithRequest<
    {},
    {
      accounts?: {
        buckets: Array<
          InfraMetadataAggregationBucket & { accountNames: InfraMetadataAggregationResponse }
        >;
      };
      projects?: InfraMetadataAggregationResponse;
      regions?: InfraMetadataAggregationResponse;
    }
  >(req, 'search', metricQuery);

  const projectBuckets =
    response.aggregations && response.aggregations.projects
      ? response.aggregations.projects.buckets
      : [];

  const regionBuckets =
    response.aggregations && response.aggregations.regions
      ? response.aggregations.regions.buckets
      : [];

  const accounts: InventoryCloudAccount[] = [];
  if (response.aggregations && response.aggregations.accounts) {
    response.aggregations.accounts.buckets.forEach((b) => {
      if (b.accountNames.buckets.length) {
        accounts.push({
          value: b.key,
          // There should only be one account name for each account id.
          name: b.accountNames.buckets[0].key,
        });
      }
    });
  }
  return {
    accounts,
    projects: projectBuckets.map((b) => b.key),
    regions: regionBuckets.map((b) => b.key),
  };
};
