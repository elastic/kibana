/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { useState } from 'react';
import moment from 'moment';
// import { useMetricsHostsAnomaliesResults } from '../../../hooks/use_metrics_hosts_anomalies';
// import { useMetricsK8sAnomaliesResults } from '../../../hooks/use_metrics_k8s_anomalies';

export const AnomaliesTable = () => {
  // const [start] = useState(moment().toDate().getTime());

  // const SORT_DEFAULTS = {
  //   direction: 'desc' as const,
  //   field: 'anomalyScore' as const,
  // };

  // const PAGINATION_DEFAULTS = {
  //   pageSize: 25,
  // };

  // const {
  //   isLoadingMetricsHostsAnomalies,
  //   metricsHostsAnomalies,
  //   page,
  //   fetchNextPage,
  //   fetchPreviousPage,
  //   changeSortOptions,
  //   changePaginationOptions,
  //   sortOptions,
  //   paginationOptions,
  // } = useMetricsHostsAnomaliesResults({
  //   sourceId: 'default',
  //   startTime: moment(new Date(start)).subtract(10, 'd').toDate().getTime(),
  //   endTime: start,
  //   defaultSortOptions: SORT_DEFAULTS,
  //   defaultPaginationOptions: PAGINATION_DEFAULTS,
  // });

  // const { isLoadingMetricsK8sAnomalies, metricsK8sAnomalies } = useMetricsK8sAnomaliesResults({
  //   sourceId: 'default',
  //   startTime: moment(new Date(start)).subtract(10, 'd').toDate().getTime(),
  //   endTime: start,
  //   defaultSortOptions: SORT_DEFAULTS,
  //   defaultPaginationOptions: PAGINATION_DEFAULTS,
  // });

  // console.log('metricsHostsAnomalies', metricsHostsAnomalies);
  // console.log('metricsK8sAnomalies', metricsK8sAnomalies);
  return <div />;
};
