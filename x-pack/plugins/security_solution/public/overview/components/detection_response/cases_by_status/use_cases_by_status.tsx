/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { useState, useEffect } from 'react';
import { CaseStatuses } from '@kbn/cases-plugin/common';
import { APP_ID } from '../../../../../common/constants';
import { useGlobalTime } from '../../../../common/containers/use_global_time';
import { useKibana } from '../../../../common/lib/kibana';

export const useCasesByStatus = () => {
  const {
    services: { cases },
  } = useKibana();
  const { to, from } = useGlobalTime();
  const [updatedAt, setUpdatedAt] = useState(Date.now());
  const [isLoading, setIsLoading] = useState(true);
  const [casesCount, setCasesCount] = useState(null);

  // This is a known issue of cases api, it doesn't accept date time format atm
  // Once they fix this problem we can remove this two lines
  const fromDate = moment(from).format('YYYY-MM-DD');
  const toDate = moment(to).format('YYYY-MM-DD');

  useEffect(() => {
    const fetchOpen = async () => {
      const casesResponse = await cases.api.cases.find({
        status: CaseStatuses.open,
        from: fromDate,
        to: toDate,
        owner: APP_ID,
      });
      setCasesCount(casesResponse);
      setIsLoading(false);
      setUpdatedAt(Date.now());
    };
    fetchOpen();
  }, [cases.api.cases, from, fromDate, to, toDate]);

  // const inProgress = cases.api.cases.find({
  //   status: CaseStatuses['in-progress'],
  //   from,
  //   to,
  //   owner: APP_ID,
  // });

  // const closed = cases.api.cases.find({
  //   status: CaseStatuses.closed,
  //   from,
  //   to,
  //   owner: APP_ID,
  // });

  // const totalCounts = cases.api.cases.getAllCasesMetrics({
  //   from,
  //   to,
  //   owner: APP_ID,
  // });

  // useEffect(() => {
  //   if (totalCounts != null && open != null && inProgress != null && closed != null) {
  //     setIsLoading(false);
  //     setUpdatedAt(Date.now());
  //   }
  // }, [closed, inProgress, open, totalCounts]);

  return {
    closed: casesCount?.count_closed_cases,
    inProgress: casesCount?.count_in_progress_cases,
    isLoading,
    open: casesCount?.count_open_cases,
    totalCounts: casesCount?.total,
    updatedAt,
  };
};
