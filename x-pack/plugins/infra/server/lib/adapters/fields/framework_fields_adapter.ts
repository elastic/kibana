/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { startsWith, uniq, first } from 'lodash';
import { RequestHandlerContext } from 'src/core/server';
import { InfraDatabaseSearchResponse } from '../framework';
import { KibanaFramework } from '../framework/kibana_framework_adapter';
import { FieldsAdapter, IndexFieldDescriptor } from './adapter_types';
import { getAllowedListForPrefix } from '../../../../common/ecs_allowed_list';
import { getAllCompositeData } from '../../../utils/get_all_composite_data';
import { createAfterKeyHandler } from '../../../utils/create_afterkey_handler';

interface Bucket {
  key: { dataset: string };
  doc_count: number;
}

interface DataSetResponse {
  datasets: {
    buckets: Bucket[];
    after_key: {
      dataset: string;
    };
  };
}

export class FrameworkFieldsAdapter implements FieldsAdapter {
  private framework: KibanaFramework;

  constructor(framework: KibanaFramework) {
    this.framework = framework;
  }

  public async getIndexFields(
    requestContext: RequestHandlerContext,
    indices: string,
    timefield: string
  ): Promise<IndexFieldDescriptor[]> {
    const indexPatternsService = this.framework.getIndexPatternsService(requestContext);
    const response = await indexPatternsService.getFieldsForWildcard({
      pattern: indices,
    });
    const { dataSets, modules } = await this.getDataSetsAndModules(
      requestContext,
      indices,
      timefield
    );
    const allowedList = modules.reduce(
      (acc, name) => uniq([...acc, ...getAllowedListForPrefix(name)]),
      [] as string[]
    );
    const dataSetsWithAllowedList = [...allowedList, ...dataSets];
    return response.map(field => ({
      ...field,
      displayable: dataSetsWithAllowedList.some(name => startsWith(field.name, name)),
    }));
  }

  private async getDataSetsAndModules(
    requestContext: RequestHandlerContext,
    indices: string,
    timefield: string
  ): Promise<{ dataSets: string[]; modules: string[] }> {
    const params = {
      index: indices,
      allowNoIndices: true,
      ignoreUnavailable: true,
      body: {
        size: 0,
        query: {
          bool: {
            filter: [
              {
                range: {
                  [timefield]: {
                    gte: 'now-24h',
                    lte: 'now',
                  },
                },
              },
            ],
          },
        },
        aggs: {
          datasets: {
            composite: {
              sources: [
                {
                  dataset: {
                    terms: {
                      field: 'event.dataset',
                    },
                  },
                },
              ],
            },
          },
        },
      },
    };

    const bucketSelector = (response: InfraDatabaseSearchResponse<{}, DataSetResponse>) =>
      (response.aggregations && response.aggregations.datasets.buckets) || [];
    const handleAfterKey = createAfterKeyHandler(
      'body.aggs.datasets.composite.after',
      input => input?.aggregations?.datasets?.after_key
    );

    const buckets = await getAllCompositeData<DataSetResponse, Bucket>(
      this.framework,
      requestContext,
      params,
      bucketSelector,
      handleAfterKey
    );
    const dataSets = buckets.map(bucket => bucket.key.dataset);
    const modules = dataSets.reduce((acc, dataset) => {
      const module = first(dataset.split(/\./));
      return module ? uniq([...acc, module]) : acc;
    }, [] as string[]);
    return { modules, dataSets };
  }
}
