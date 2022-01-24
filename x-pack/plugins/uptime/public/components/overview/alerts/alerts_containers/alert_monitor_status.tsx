/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { isRight } from 'fp-ts/lib/Either';
import { selectedFiltersSelector } from '../../../../state/selectors';
import { AlertMonitorStatusComponent } from '../monitor_status_alert/alert_monitor_status';
import { setSearchTextAction } from '../../../../state/actions';
import {
  AtomicStatusCheckParamsType,
  GetMonitorAvailabilityParamsType,
} from '../../../../../common/runtime_types';

import { useSnapShotCount } from './use_snap_shot';
import { FILTER_FIELDS } from '../../../../../common/constants';

const { TYPE, TAGS, LOCATION, PORT } = FILTER_FIELDS;

interface Props {
  ruleParams: { [key: string]: any };
  enabled: boolean;
  numTimes: number;
  setRuleParams: (key: string, value: any) => void;
  timerange: {
    from: string;
    to: string;
  };
}

export const AlertMonitorStatus: React.FC<Props> = ({
  enabled,
  numTimes,
  setRuleParams,
  timerange,
  ruleParams,
}) => {
  const dispatch = useDispatch();

  useEffect(() => {
    if (ruleParams.search) {
      dispatch(setSearchTextAction(ruleParams.search));
    }
  }, [ruleParams, dispatch]);

  const { count, loading } = useSnapShotCount({
    query: ruleParams.search,
    filters: ruleParams.filters,
  });

  const isOldAlert = React.useMemo(
    () =>
      Object.entries(ruleParams).length > 0 &&
      !isRight(AtomicStatusCheckParamsType.decode(ruleParams)) &&
      !isRight(GetMonitorAvailabilityParamsType.decode(ruleParams)),
    [ruleParams]
  );

  const selectedFilters = useSelector(selectedFiltersSelector);
  useEffect(() => {
    if (!ruleParams.filters && selectedFilters !== null) {
      setRuleParams('filters', {
        [PORT]: selectedFilters?.ports ?? [],
        [LOCATION]: selectedFilters?.locations ?? [],
        [TYPE]: selectedFilters?.schemes ?? [],
        [TAGS]: selectedFilters?.tags ?? [],
      });
    }
  }, [ruleParams, setRuleParams, selectedFilters]);

  return (
    <AlertMonitorStatusComponent
      ruleParams={ruleParams}
      enabled={enabled}
      isOldAlert={isOldAlert}
      numTimes={numTimes}
      setRuleParams={setRuleParams}
      snapshotCount={count.total}
      snapshotLoading={loading}
      timerange={timerange}
    />
  );
};

// eslint-disable-next-line import/no-default-export
export { AlertMonitorStatus as default };
