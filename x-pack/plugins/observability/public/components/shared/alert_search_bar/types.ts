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
  setRangeFrom: (rangeFrom: string) => AlertSearchBarContainerState;
  setRangeTo: (rangeTo: string) => AlertSearchBarContainerState;
  setKuery: (kuery: string) => AlertSearchBarContainerState;
  setStatus: (status: AlertStatus) => AlertSearchBarContainerState;
}

export interface CommonAlertSearchBarProps {
  appName: string;
  setEsQuery: (query: { bool: BoolQuery }) => void;
  queries?: Query[];
}

export interface AlertSearchBarWithUrlSyncProps extends CommonAlertSearchBarProps {
  urlStorageKey: string;
}

export interface AlertSearchBarProps
  extends AlertSearchBarContainerState,
    AlertSearchBarStateTransitions,
    CommonAlertSearchBarProps {}
