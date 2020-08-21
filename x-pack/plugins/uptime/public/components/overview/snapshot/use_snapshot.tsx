/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useGetUrlParams } from '../../../hooks';
import { getSnapshotCountAction } from '../../../state/actions';
import { esKuerySelector } from '../../../state/selectors';
import { UptimeRefreshContext } from '../../../contexts';

export const useSnapshot = () => {
  const { dateRangeStart, dateRangeEnd } = useGetUrlParams();

  const { lastRefresh } = useContext(UptimeRefreshContext);

  const esKuery = useSelector(esKuerySelector);

  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(getSnapshotCountAction({ dateRangeStart, dateRangeEnd, filters: esKuery }));
  }, [dateRangeStart, dateRangeEnd, esKuery, lastRefresh, dispatch]);
};
