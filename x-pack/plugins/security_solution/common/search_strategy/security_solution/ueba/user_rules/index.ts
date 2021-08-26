/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IEsSearchResponse } from '../../../../../../../../src/plugins/data/common';

import { HostRulesFields, UserRulesFields } from '../common';
import { Hit, Inspect, Maybe, PageInfoPaginated, SearchHit, SortField } from '../../../common';
import { HostRulesEdges, RequestOptionsPaginated } from '../..';

export interface RuleNameHit extends Hit {
  key: string;
  doc_count: number;
  risk_score: {
    value: number;
  };
  rule_type: {
    buckets?: Array<{
      key: string;
      doc_count: number;
    }>;
  };
}
export interface UserRulesHit extends Hit {
  _source: {
    '@timestamp': string;
  };
  key: string;
  doc_count: number;
  risk_score: {
    value: number;
  };
  rule_count: {
    value: number;
  };
  rule_name: {
    buckets?: RuleNameHit[];
  };
}

export interface UserRulesByUser {
  _id?: Maybe<string>;
  [UserRulesFields.userName]: string;
  [UserRulesFields.riskScore]: number;
  [UserRulesFields.ruleCount]: number;
  [UserRulesFields.rules]: HostRulesEdges[];
}

export interface UserRulesStrategyUserResponse {
  [UserRulesFields.userName]: string;
  [UserRulesFields.riskScore]: number;
  edges: HostRulesEdges[];
  totalCount: number;
  pageInfo: PageInfoPaginated;
}

export interface UserRulesStrategyResponse extends IEsSearchResponse {
  inspect?: Maybe<Inspect>;
  data: UserRulesStrategyUserResponse[];
}

export interface UserRulesRequestOptions extends RequestOptionsPaginated<HostRulesFields> {
  defaultIndex: string[];
  hostName: string;
}

export type UserRulesSortField = SortField<HostRulesFields>;

export interface UsersRulesHit extends SearchHit {
  aggregations: {
    user_data: {
      buckets: UserRulesHit[];
    };
  };
}
