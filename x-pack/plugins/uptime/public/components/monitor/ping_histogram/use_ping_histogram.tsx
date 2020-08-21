/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useContext, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getPingHistogram } from '../../../state/actions';
import { esKuerySelector } from '../../../state/selectors';
import { useGetUrlParams } from '../../../hooks';
import { useMonitorId } from '../../../hooks';
import { UptimeRefreshContext } from '../../../contexts';

export const usePingHistogram = () => {
  const { dateRangeStart: dateStart, dateRangeEnd: dateEnd } = useGetUrlParams();

  const dispatch = useDispatch();
  const monitorId = useMonitorId();

  const { lastRefresh } = useContext(UptimeRefreshContext);

  const esKuery = useSelector(esKuerySelector);

  useEffect(() => {
    dispatch(getPingHistogram({ monitorId, dateStart, dateEnd, filters: esKuery }));
  }, [dateStart, dateEnd, monitorId, lastRefresh, esKuery, dispatch]);
};
