/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { AnomalyScores } from '../../../../common/components/ml/score/anomaly_scores';
import { scoreIntervalToDateTime } from '../../../../common/components/ml/score/score_interval_to_datetime';
import { useGlobalTime } from '../../../../common/containers/use_global_time';
import { setAbsoluteRangeDatePicker } from '../../../../common/store/inputs/actions';
import { InputsModelId } from '../../../../common/store/inputs/constants';
import type { EntityAnomalies } from './observed_entity/types';

export const AnomaliesField = ({ anomalies }: { anomalies: EntityAnomalies }) => {
  const { to, from } = useGlobalTime();
  const dispatch = useDispatch();

  const narrowDateRange = useCallback(
    (score, interval) => {
      const fromTo = scoreIntervalToDateTime(score, interval);
      dispatch(
        setAbsoluteRangeDatePicker({
          id: InputsModelId.global,
          from: fromTo.from,
          to: fromTo.to,
        })
      );
    },
    [dispatch]
  );

  return (
    <AnomalyScores
      anomalies={anomalies.anomalies}
      startDate={from}
      endDate={to}
      isLoading={anomalies.isLoading}
      narrowDateRange={narrowDateRange}
      jobNameById={anomalies.jobNameById}
    />
  );
};
