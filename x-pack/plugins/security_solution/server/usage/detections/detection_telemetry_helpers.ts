/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { INTERNAL_IMMUTABLE_KEY } from '../../../common/constants';

export const isElasticRule = (tags: string[] = []) =>
  tags.includes(`${INTERNAL_IMMUTABLE_KEY}:true`);

interface RuleSearchBody {
  query: {
    bool: {
      filter: {
        term: { [key: string]: string };
      };
    };
  };
}

export interface RuleSearchParams {
  body: RuleSearchBody;
  filterPath: string[];
  ignoreUnavailable: boolean;
  index: string;
  size: number;
}

export interface RuleSearchResult {
  alert: {
    name: string;
    enabled: boolean;
    tags: string[];
    createdAt: string;
    updatedAt: string;
    params: DetectionRuleParms;
  };
}

interface DetectionRuleParms {
  ruleId: string;
  version: string;
  type: string;
}
