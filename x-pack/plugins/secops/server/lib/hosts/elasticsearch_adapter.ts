/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, getOr, has, merge } from 'lodash/fp';
import { HostItem, HostsData } from '../../../common/graphql/types';
import { FrameworkAdapter, FrameworkRequest } from '../framework';
import { TermAggregation } from '../types';
import { buildQuery, HostsFieldsMap } from './query.dsl';
import { HostData, HostsAdapter, HostsRequestOptions } from './types';

export class ElasticsearchHostsAdapter implements HostsAdapter {
  private framework: FrameworkAdapter;
  constructor(framework: FrameworkAdapter) {
    this.framework = framework;
  }

  public async getHosts(
    request: FrameworkRequest,
    options: HostsRequestOptions
  ): Promise<HostsData> {
    const response = await this.framework.callWithRequest<HostData, TermAggregation>(
      request,
      'search',
      buildQuery(options)
    );
    const total = getOr(0, 'aggregations.host_count.value', response);
    const hits = response.hits.hits;
    const hosts = hits.map(formatHostsData(options.fields)) as [HostItem];
    return {
      hosts,
      total,
    } as HostsData;
  }
}

const formatHostsData = (fields: string[]) => (hit: HostData) =>
  fields.reduce(
    (flattenedFields, fieldName) => {
      flattenedFields._id = get('_id', hit);
      if (HostsFieldsMap.hasOwnProperty(fieldName)) {
        const esField = Object.getOwnPropertyDescriptor(HostsFieldsMap, fieldName);
        return has(esField && esField.value, hit._source)
          ? merge(
              flattenedFields,
              fieldName
                .split('.')
                .reduceRight(
                  (obj, next) => ({ [next]: obj }),
                  get(esField && esField.value, hit._source)
                )
            )
          : flattenedFields;
      }
      return flattenedFields;
    },
    {} as { [fieldName: string]: string | number | boolean | null }
  );
