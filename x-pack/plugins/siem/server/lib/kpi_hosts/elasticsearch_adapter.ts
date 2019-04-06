/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr } from 'lodash/fp';

import { KpiHostsData } from '../../graphql/types';
// tslint:disable-next-line: prettier
import { FrameworkAdapter, FrameworkRequest, RequestBasicOptions } from '../framework';
import { TermAggregation } from '../types';

import { buildGeneralQuery } from './query_general.dsl';
import { KpiHostsAdapter, KpiHostsESMSearchBody, KpiHostsHit } from './types';

export class ElasticsearchKpiHostsAdapter implements KpiHostsAdapter {
  constructor(private readonly framework: FrameworkAdapter) {}

  public async getKpiHosts(
    request: FrameworkRequest,
    options: RequestBasicOptions
  ): Promise<KpiHostsData> {
    const generalQuery: KpiHostsESMSearchBody[] = buildGeneralQuery(options);
    const response = await this.framework.callWithRequest<KpiHostsHit, TermAggregation>(
      request,
      'msearch',
      {
        body: [...generalQuery],
      }
    );

    return {
      hosts: getOr(null, 'responses.0.hits.total.value', response),
    };
  }
}
