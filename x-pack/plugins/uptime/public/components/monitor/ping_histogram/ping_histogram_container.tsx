/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { PingHistogramComponent } from '../../common/charts';
import { getPingHistogram } from '../../../state/actions';
import { esKuerySelector, selectPingHistogram } from '../../../state/selectors';
import { useGetUrlParams } from '../../../hooks';
import { useMonitorId } from '../../../hooks';
import { ResponsiveWrapperProps, withResponsiveWrapper } from '../../common/higher_order';
import { UptimeRefreshContext } from '../../../contexts';
import { useOverviewFilterCheck } from '../../../hooks/use_overview_filter_check';

interface Props {
  height: string;
}

const Container: React.FC<Props & ResponsiveWrapperProps> = ({ height }) => {
  const {
    query,
    absoluteDateRangeStart,
    absoluteDateRangeEnd,
    dateRangeStart: dateStart,
    dateRangeEnd: dateEnd,
  } = useGetUrlParams();
  const filterCheck = useOverviewFilterCheck();

  const dispatch = useDispatch();
  const monitorId = useMonitorId();

  const { lastRefresh } = useContext(UptimeRefreshContext);

  const esKuery = useSelector(esKuerySelector);

  const { loading, pingHistogram: data } = useSelector(selectPingHistogram);

  useEffect(() => {
    if (monitorId) {
      // we don't need filter check on monitor details page, where we have monitorId defined
      dispatch(getPingHistogram.get({ monitorId, dateStart, dateEnd, query, filters: esKuery }));
    } else {
      filterCheck(() =>
        dispatch(getPingHistogram.get({ monitorId, dateStart, dateEnd, query, filters: esKuery }))
      );
    }
  }, [filterCheck, dateStart, dateEnd, monitorId, lastRefresh, esKuery, dispatch, query]);
  return (
    <PingHistogramComponent
      data={data}
      absoluteStartDate={absoluteDateRangeStart}
      absoluteEndDate={absoluteDateRangeEnd}
      height={height}
      loading={loading}
    />
  );
};

export const PingHistogram = withResponsiveWrapper(Container);
