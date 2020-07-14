/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useSelector, useDispatch } from 'react-redux';
import React, { useContext, useCallback } from 'react';
import { selectPingList } from '../../../state/selectors';
import { getPings } from '../../../state/actions';
import { GetPingsParams } from '../../../../common/runtime_types';
import { UptimeRefreshContext, UptimeSettingsContext } from '../../../contexts';
import { PingListComponent } from './index';

export interface PingListProps {
  monitorId: string;
}

export const PingList = (props: PingListProps) => {
  const {
    error,
    loading,
    pingList: { locations, pings, total },
  } = useSelector(selectPingList);

  const { lastRefresh } = useContext(UptimeRefreshContext);

  const { dateRangeStart: drs, dateRangeEnd: dre } = useContext(UptimeSettingsContext);

  const dispatch = useDispatch();
  const getPingsCallback = useCallback((params: GetPingsParams) => dispatch(getPings(params)), [
    dispatch,
  ]);

  return (
    <PingListComponent
      dateRange={{
        from: drs,
        to: dre,
      }}
      error={error}
      getPings={getPingsCallback}
      lastRefresh={lastRefresh}
      loading={loading}
      locations={locations}
      pings={pings}
      total={total}
      {...props}
    />
  );
};
