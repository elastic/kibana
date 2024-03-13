/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isPopulatedObject } from '@kbn/ml-is-populated-object';

import { type TransformHealth, type TransformState, TRANSFORM_STATE } from '../constants';
import type { TransformId } from './transform';

export interface TransformHealthIssue {
  type: string;
  issue: string;
  details?: string;
  count: number;
  first_occurrence?: number;
}

export interface TransformStats {
  id: TransformId;
  checkpointing: {
    last: {
      checkpoint: number;
      timestamp_millis?: number;
    };
    next?: {
      checkpoint: number;
      checkpoint_progress?: {
        total_docs: number;
        docs_remaining: number;
        percent_complete: number;
      };
    };
    changes_last_detected_at: number;
    last_search_time?: number;
    operations_behind?: number;
  };
  health: {
    status: TransformHealth;
    issues?: TransformHealthIssue[];
  };
  node?: {
    id: string;
    name: string;
    ephemeral_id: string;
    transport_address: string;
    attributes: Record<string, any>;
  };
  stats: {
    delete_time_in_ms: number;
    documents_deleted: number;
    documents_indexed: number;
    documents_processed: number;
    index_failures: number;
    index_time_in_ms: number;
    index_total: number;
    pages_processed: number;
    search_failures: number;
    search_time_in_ms: number;
    search_total: number;
    trigger_count: number;
    processing_time_in_ms: number;
    processing_total: number;
    exponential_avg_checkpoint_duration_ms: number;
    exponential_avg_documents_indexed: number;
    exponential_avg_documents_processed: number;
  };
  reason?: string;
  state: TransformState;
}

function isTransformState(arg: unknown): arg is TransformState {
  return typeof arg === 'string' && Object.values(TRANSFORM_STATE).includes(arg as TransformState);
}

export function isTransformStats(arg: unknown): arg is TransformStats {
  return isPopulatedObject(arg, ['state']) && isTransformState(arg.state);
}
