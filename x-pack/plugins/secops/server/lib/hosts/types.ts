/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  HostsData,
  PaginationInput,
  SourceConfiguration,
  TimerangeInput,
} from '../../../common/graphql/types';
import { FrameworkRequest } from '../framework';
import { ESQuery, SearchHit } from '../types';

export interface HostsAdapter {
  getHosts(req: FrameworkRequest, options: HostsRequestOptions): Promise<HostsData>;
}

export interface HostsRequestOptions {
  sourceConfiguration: SourceConfiguration;
  pagination: PaginationInput;
  timerange: TimerangeInput;
  filterQuery: ESQuery | undefined;
  fields: string[];
}

export interface HostData extends SearchHit {
  sort: string[];
  _source: {
    // tslint:disable-next-line:no-any
    [field: string]: any;
  };
  aggregations: {
    // tslint:disable-next-line:no-any
    [agg: string]: any;
  };
}
