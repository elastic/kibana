/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ParsedTechnicalFields } from '@kbn/rule-registry-plugin/common';

export interface RawEventData {
  fields: ParsedTechnicalFields;
  _id: string;
  _index: string;
}

export enum RESPONSE_ACTION_TYPES {
  OSQUERY = '.osquery',
  ENDPOINT = '.endpoint',
}

export interface ExpandedEventFieldsObject {
  agent?: {
    id: string[];
  };
  kibana: {
    alert?: {
      rule?: {
        parameters: RuleParameters;
        name: string[];
      };
    };
  };
}

type RuleParameters = Array<{
  response_actions: Array<{
    action_type_id: RESPONSE_ACTION_TYPES;
    params: Record<string, unknown>;
  }>;
}>;
