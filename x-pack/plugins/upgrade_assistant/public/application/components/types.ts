/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ResponseError } from '../lib/api';

export enum LoadingState {
  Loading,
  Success,
  Error,
}

export type LevelFilterOption = 'all' | 'critical';

export enum GroupByOption {
  message = 'message',
  index = 'index',
  node = 'node',
}

export type DeprecationTableColumns =
  | 'type'
  | 'index'
  | 'message'
  | 'correctiveAction'
  | 'isCritical';

export type Status = 'in_progress' | 'complete' | 'idle' | 'error';
export interface DeprecationLoggingPreviewProps {
  isDeprecationLogIndexingEnabled: boolean;
  onlyDeprecationLogWritingEnabled: boolean;
  isLoading: boolean;
  isUpdating: boolean;
  fetchError: ResponseError | null;
  updateError: ResponseError | undefined;
  resendRequest: () => void;
  toggleLogging: () => void;
}

export type UPGRADE_STATUS_STATUS = 'UPGRADE_NEEDED' | 'NO_UPGRADE_NEEDED' | 'IN_PROGRESS';
export interface SystemIndicesUpgradeStatus {
  features: Array<{
    id: string;
    feature_name: string;
    minimum_index_version: string;
    upgrade_status: UPGRADE_STATUS_STATUS;
    indices: Array<{
      index: string;
      index_version: string;
    }>;
  }>;
  upgrade_status: UPGRADE_STATUS_STATUS;
}
