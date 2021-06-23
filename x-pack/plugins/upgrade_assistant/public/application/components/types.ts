/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EnrichedDeprecationInfo, UpgradeAssistantStatus } from '../../../common/types';
import { ResponseError } from '../lib/api';

export interface UpgradeAssistantTabProps {
  alertBanner?: React.ReactNode;
  checkupData?: UpgradeAssistantStatus | null;
  deprecations?: EnrichedDeprecationInfo[];
  refreshCheckupData: () => void;
  error: ResponseError | null;
  isLoading: boolean;
  navigateToOverviewPage: () => void;
}

// eslint-disable-next-line react/prefer-stateless-function
export class UpgradeAssistantTabComponent<
  T extends UpgradeAssistantTabProps = UpgradeAssistantTabProps,
  S = {}
> extends React.Component<T, S> {}

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

export enum TelemetryState {
  Running,
  Complete,
}

export type EsTabs = 'cluster' | 'indices';
