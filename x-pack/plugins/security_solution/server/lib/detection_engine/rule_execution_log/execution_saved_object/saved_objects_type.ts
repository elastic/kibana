/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObject, SavedObjectsType } from '@kbn/core/server';
import {
  RuleExecutionMetrics,
  RuleExecutionStatus,
  RuleExecutionStatusOrder,
} from '../../../../../common/detection_engine/schemas/common';

export const RULE_EXECUTION_SO_TYPE = 'siem-detection-engine-rule-execution-info';

/**
 * This side-car SO stores information about rule executions (like last status and metrics).
 * Eventually we're going to replace it with data stored in the rule itself:
 * https://github.com/elastic/kibana/issues/112193
 */
export type RuleExecutionSavedObject = SavedObject<RuleExecutionAttributes>;

export interface RuleExecutionAttributes {
  last_execution: {
    date: string;
    status: RuleExecutionStatus;
    status_order: RuleExecutionStatusOrder;
    message: string;
    metrics: RuleExecutionMetrics;
  };
}

const ruleExecutionMappings: SavedObjectsType['mappings'] = {
  properties: {
    last_execution: {
      type: 'object',
      properties: {
        date: {
          type: 'date',
        },
        status: {
          type: 'keyword',
          ignore_above: 1024,
        },
        status_order: {
          type: 'long',
        },
        message: {
          type: 'text',
        },
        metrics: {
          type: 'object',
          properties: {
            total_search_duration_ms: {
              type: 'long',
            },
            total_indexing_duration_ms: {
              type: 'long',
            },
            execution_gap_duration_s: {
              type: 'long',
            },
          },
        },
      },
    },
  },
};

export const ruleExecutionType: SavedObjectsType = {
  name: RULE_EXECUTION_SO_TYPE,
  mappings: ruleExecutionMappings,
  hidden: false,
  namespaceType: 'multiple-isolated',
  convertToMultiNamespaceTypeVersion: '8.0.0',
};
