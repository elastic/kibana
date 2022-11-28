/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BoolQuery, Query } from '@kbn/es-query';
import { AlertStatus } from '../../../../common/typings';

export interface AlertStatusFilterProps {
  status: AlertStatus;
  onChange: (id: string, value: string) => void;
}

interface AlertSearchBarContainerState {
  rangeFrom: string;
  rangeTo: string;
  kuery: string;
  status: AlertStatus;
}

interface AlertSearchBarStateTransitions {
  onRangeFromChange: (rangeFrom: string) => void;
  onRangeToChange: (rangeTo: string) => void;
  onKueryChange: (kuery: string) => void;
  onStatusChange: (status: AlertStatus) => void;
}

export interface CommonAlertSearchBarProps {
  appName: string;
  onEsQueryChange: (query: { bool: BoolQuery }) => void;
  defaultSearchQueries?: Query[];
}

export interface AlertSearchBarWithUrlSyncProps extends CommonAlertSearchBarProps {
  urlStorageKey: string;
}

export interface ObservabilityAlertSearchBarProps
  extends AlertSearchBarContainerState,
    AlertSearchBarStateTransitions,
    CommonAlertSearchBarProps {}
