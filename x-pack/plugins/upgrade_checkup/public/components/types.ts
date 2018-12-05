/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EnrichedDeprecationInfo, UpgradeCheckupStatus } from '../../server/lib/es_migration_apis';

export interface UpgradeCheckupTabProps {
  checkupData?: UpgradeCheckupStatus;
  deprecations?: EnrichedDeprecationInfo[];
  refreshCheckupData: () => Promise<void>;
  loadingState: LoadingState;
  setSelectedTabIndex: (tabIndex: number) => void;
}

export class UpgradeCheckupTabComponent<
  T extends UpgradeCheckupTabProps = UpgradeCheckupTabProps,
  S = {}
> extends React.Component<T, S> {}

export enum LoadingState {
  Loading,
  Success,
  Error,
}

export enum LevelFilterOption {
  warning = 'warning',
  critical = 'critical',
}

export enum GroupByOption {
  message = 'message',
  index = 'index',
  node = 'node',
}
