/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ReactElement } from 'react';
import { ToastsStart } from '@kbn/core-notifications-browser';
import { TimefilterContract } from '@kbn/data-plugin/public';
import { AlertsSearchBarProps } from '@kbn/triggers-actions-ui-plugin/public/application/sections/alerts_search_bar';
import { BoolQuery, Query } from '@kbn/es-query';
import { AlertStatus } from '../../../../common/typings';

export interface AlertStatusFilterProps {
  status: AlertStatus;
  onChange: (id: AlertStatus) => void;
}

export interface AlertSearchBarWithUrlSyncProps extends CommonAlertSearchBarProps {
  urlStorageKey: string;
}

export interface Dependencies {
  data: {
    query: {
      timefilter: { timefilter: TimefilterContract };
    };
  };
  triggersActionsUi: {
    getAlertsSearchBar: (props: AlertsSearchBarProps) => ReactElement<AlertsSearchBarProps>;
  };
  useToasts: () => ToastsStart;
}

export interface Services {
  timeFilterService: TimefilterContract;
  AlertsSearchBar: (props: AlertsSearchBarProps) => ReactElement<AlertsSearchBarProps>;
  useToasts: () => ToastsStart;
}

export interface ObservabilityAlertSearchBarProps
  extends AlertSearchBarContainerState,
    AlertSearchBarStateTransitions,
    CommonAlertSearchBarProps {
  services: Services;
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

interface CommonAlertSearchBarProps {
  appName: string;
  onEsQueryChange: (query: { bool: BoolQuery }) => void;
  defaultSearchQueries?: Query[];
}
