/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UMElasticsearchQueryFn } from '../adapters';
import { MonitorDetails, Ping } from '../../../common/runtime_types';

export interface GetAlertsInstancesParams {
  consumers: string[];
  dateStart: string;
  dateEnd: string;
  alertsClient: any;
  active: boolean;
}

const getAlerts = async ({
  consumers,
  alertsClient,
  active,
  dateStart,
  dateEnd,
}: {
  consumers: string[];
  alertsClient: any;
  active: boolean;
  dateStart?: string;
  dateEnd?: string;
}) => {
  const options: any = {
    page: 1,
    perPage: 500,
    filter:
      consumers.map((consumer) => `alert.attributes.consumer:(${consumer})`) +
      `and alert.attributes.executionStatus.status:${active ? 'active' : 'ok'}`,
    defaultSearchOperator: 'OR',
    sortField: 'name.keyword',
  };

  const { data } = await alertsClient.find({ options });
  const summaryAlertsInstances = await alertsClient.getAlertsInstanceSummaryFromEventLog(
    data,
    dateStart,
    dateEnd
  );
  return summaryAlertsInstances.map((activeInstances: any) => ({
    ...activeInstances,
    instances: activeInstances.filter(
      (instance: any) =>
        (active && instance.status === 'active') || (!active && instance.status === 'ok')
    ),
  }));
};

export const getAlertsInstances: UMElasticsearchQueryFn<
  GetAlertsInstancesParams,
  MonitorDetails
> = async ({ consumers, active, dateStart, dateEnd, alertsClient }) => {
  return await getAlerts({
    consumers,
    alertsClient,
    active,
    dateStart,
    dateEnd,
  });
};
