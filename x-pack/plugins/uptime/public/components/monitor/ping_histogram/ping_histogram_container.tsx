/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { PingHistogramComponent } from '../../common/charts';
import { getPingHistogram } from '../../../state/actions';
import { esKuerySelector, selectPingHistogram, dateRangeSelector } from '../../../state/selectors';
import { useAbsoluteDateRange, useMonitorId } from '../../../hooks';
import { ResponsiveWrapperProps, withResponsiveWrapper } from '../../common/higher_order';
import { UptimeRefreshContext } from '../../../contexts';

interface Props {
  height: string;
}

const Container: React.FC<Props & ResponsiveWrapperProps> = ({ height }) => {
  const monitorId = useMonitorId();

  const { lastRefresh } = useContext(UptimeRefreshContext);

  const esKuery = useSelector(esKuerySelector);

  const { loading, pingHistogram: data } = useSelector(selectPingHistogram);

  const { from: absFrom, to: absTo, updateDateRange } = useAbsoluteDateRange();
  const { from: dateStart, to: dateEnd } = useSelector(dateRangeSelector);

  const dispatch = useDispatch();
  useEffect(() => {
    dispatch(
      getPingHistogram({
        monitorId,
        dateStart,
        dateEnd,
        filters: esKuery,
      })
    );
  }, [dateStart, dateEnd, monitorId, lastRefresh, esKuery, dispatch]);

  return (
    <PingHistogramComponent
      data={data}
      absoluteStartDate={absFrom}
      absoluteEndDate={absTo}
      height={height}
      loading={loading}
      updateDateRange={updateDateRange}
    />
  );
};

export const PingHistogram = withResponsiveWrapper(Container);
