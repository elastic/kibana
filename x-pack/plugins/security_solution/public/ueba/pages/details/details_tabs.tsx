/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { Route, Switch } from 'react-router-dom';

import { UpdateDateRange } from '../../../common/components/charts/common';
import { scoreIntervalToDateTime } from '../../../common/components/ml/score/score_interval_to_datetime';
import { Anomaly } from '../../../common/components/ml/types';
import { UebaTableType } from '../../store/model';
import { useGlobalTime } from '../../../common/containers/use_global_time';

import { UebaDetailsTabsProps } from './types';
import { type } from './utils';

import {
  HostRulesQueryTabBody,
  HostTacticsQueryTabBody,
  UserRulesQueryTabBody,
} from '../navigation';

export const UebaDetailsTabs = React.memo<UebaDetailsTabsProps>(
  ({
    detailName,
    docValueFields,
    filterQuery,
    indexNames,
    indexPattern,
    pageFilters,
    setAbsoluteRangeDatePicker,
    uebaDetailsPagePath,
  }) => {
    const { from, to, isInitializing, deleteQuery, setQuery } = useGlobalTime();
    const narrowDateRange = useCallback(
      (score: Anomaly, interval: string) => {
        const fromTo = scoreIntervalToDateTime(score, interval);
        setAbsoluteRangeDatePicker({
          id: 'global',
          from: fromTo.from,
          to: fromTo.to,
        });
      },
      [setAbsoluteRangeDatePicker]
    );

    const updateDateRange = useCallback<UpdateDateRange>(
      ({ x }) => {
        if (!x) {
          return;
        }
        const [min, max] = x;
        setAbsoluteRangeDatePicker({
          id: 'global',
          from: new Date(min).toISOString(),
          to: new Date(max).toISOString(),
        });
      },
      [setAbsoluteRangeDatePicker]
    );

    const tabProps = {
      deleteQuery,
      endDate: to,
      filterQuery,
      skip: isInitializing || filterQuery === undefined,
      setQuery,
      startDate: from,
      type,
      indexPattern,
      indexNames,
      hostName: detailName,
      narrowDateRange,
      updateDateRange,
    };
    return (
      <Switch>
        <Route path={`${uebaDetailsPagePath}/:tabName(${UebaTableType.hostRules})`}>
          <HostRulesQueryTabBody {...tabProps} />
        </Route>
        <Route path={`${uebaDetailsPagePath}/:tabName(${UebaTableType.hostTactics})`}>
          <HostTacticsQueryTabBody {...tabProps} />
        </Route>
        <Route path={`${uebaDetailsPagePath}/:tabName(${UebaTableType.userRules})`}>
          <UserRulesQueryTabBody {...tabProps} />
        </Route>
      </Switch>
    );
  }
);

UebaDetailsTabs.displayName = 'UebaDetailsTabs';
