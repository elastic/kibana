/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UMElasticsearchQueryFn } from '../adapters';
import { MonitorDetails } from '../../../common/runtime_types';

export interface GetAlertsInstancesParams {
  consumers: string[];
  dateStart: string;
  dateEnd: string;
  alertsClient: any;
  status?: string;
}

const getAlerts = async ({
  consumers,
  alertsClient,
  status,
  dateStart,
  dateEnd,
}: {
  consumers: string[];
  alertsClient: any;
  status?: string;
  dateStart?: string;
  dateEnd?: string;
}) => {
  const consumersFilter = consumers
    .map((consumer) => `alert.attributes.consumer:(${consumer})`)
    .join(' or ');
  const options: any = {
    page: 1,
    perPage: 500,
    filter: consumersFilter,
    // + (status ? ` and alert.attributes.executionStatus.status:(${status})` : ''),
    defaultSearchOperator: 'OR',
    // sortField: 'name.keyword',
  };

  const { data } = await alertsClient.find({ options });
  const summaryAlertsInstances = await alertsClient.getAlertsInstanceSummaryFromEventLog(
    data,
    dateStart,
    dateEnd
  );

  return summaryAlertsInstances.reduce(
    (alerts: unknown[], activeInstances: Record<string, unknown>) => {
      const activeInstancesFiltered = Object.entries(activeInstances);
      alerts.push({
        ...activeInstances,
        instances:
          status && activeInstances
            ? activeInstancesFiltered.filter((instance: any) => instance.status === status)
            : activeInstances,
      });
      return alerts;
    },
    []
  );
};

export const getAlertsInstances: UMElasticsearchQueryFn<
  GetAlertsInstancesParams,
  MonitorDetails
> = async ({ consumers, status, dateStart, dateEnd, alertsClient }) => {
  return await getAlerts({
    consumers,
    alertsClient,
    status,
    dateStart,
    dateEnd,
  });
};
