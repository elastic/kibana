/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { IpOverviewData } from '../../graphql/types';
import { FrameworkRequest, RequestBasicOptions } from '../framework';
import { SearchHit } from '../types';

export interface IpOverviewAdapter {
  getIpOverview(request: FrameworkRequest, options: RequestBasicOptions): Promise<IpOverviewData>;
}

export interface IpOverviewHit extends SearchHit {
  aggregations: {
    ip: {
      value: string;
    };
  };
}

export interface GenericBuckets {
  key: string;
  doc_count: number;
}
