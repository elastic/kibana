/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import { Route, Switch } from 'react-router-dom';

import { UebaTabsProps } from './types';
import { scoreIntervalToDateTime } from '../../common/components/ml/score/score_interval_to_datetime';
import { Anomaly } from '../../common/components/ml/types';
import { UebaTableType } from '../store/model';
import { UpdateDateRange } from '../../common/components/charts/common';
import { UEBA_PATH } from '../../../common/constants';
import { RiskScoreQueryTabBody } from './navigation';

export const UebaTabs = memo<UebaTabsProps>(
  ({
    deleteQuery,
    docValueFields,
    filterQuery,
    from,
    indexNames,
    isInitializing,
    setAbsoluteRangeDatePicker,
    setQuery,
    to,
    type,
  }) => {
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
      indexNames,
      skip: isInitializing || filterQuery === undefined,
      setQuery,
      startDate: from,
      type,
      narrowDateRange,
      updateDateRange,
    };

    return (
      <Switch>
        <Route path={`${UEBA_PATH}/:tabName(${UebaTableType.riskScore})`}>
          <RiskScoreQueryTabBody docValueFields={docValueFields} {...tabProps} />
        </Route>
      </Switch>
    );
  }
);

UebaTabs.displayName = 'UebaTabs';
