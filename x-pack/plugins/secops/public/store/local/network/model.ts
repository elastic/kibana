/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KueryFilterQuery, SerializedFilterQuery } from '../model';

export enum NetworkType {
  page = 'page',
  details = 'details',
}

export interface BasicQuery {
  limit: number;
}

interface NetworkQueries {
  topSource: BasicQuery;
  topDestination: BasicQuery;
}

export interface GenericNetworkModel {
  filterQuery: SerializedFilterQuery | null;
  filterQueryDraft: KueryFilterQuery | null;
  queries: NetworkQueries | null;
}

export interface NetworkModel {
  page: GenericNetworkModel;
  details: GenericNetworkModel;
}
