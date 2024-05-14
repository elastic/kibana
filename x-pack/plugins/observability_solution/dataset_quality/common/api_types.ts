/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';

export const dataStreamStatRt = rt.intersection([
  rt.type({
    name: rt.string,
  }),
  rt.partial({
    size: rt.string,
    sizeBytes: rt.number,
    lastActivity: rt.number,
    integration: rt.string,
  }),
]);

export type DataStreamStat = rt.TypeOf<typeof dataStreamStatRt>;

export const dashboardRT = rt.type({
  id: rt.string,
  title: rt.string,
});

export const integrationDashboardsRT = rt.type({
  dashboards: rt.array(dashboardRT),
});

export type IntegrationDashboards = rt.TypeOf<typeof integrationDashboardsRT>;
export type Dashboard = rt.TypeOf<typeof dashboardRT>;

export const getIntegrationDashboardsResponseRt = rt.exact(integrationDashboardsRT);

export const integrationIconRt = rt.intersection([
  rt.type({
    path: rt.string,
    src: rt.string,
  }),
  rt.partial({
    title: rt.string,
    size: rt.string,
    type: rt.string,
  }),
]);

export const integrationRt = rt.intersection([
  rt.type({
    name: rt.string,
  }),
  rt.partial({
    title: rt.string,
    version: rt.string,
    icons: rt.array(integrationIconRt),
    datasets: rt.record(rt.string, rt.string),
    dashboards: rt.array(dashboardRT),
  }),
]);

export type Integration = rt.TypeOf<typeof integrationRt>;

export const getIntegrationsResponseRt = rt.exact(
  rt.type({
    integrations: rt.array(integrationRt),
  })
);

export const degradedDocsRt = rt.type({
  dataset: rt.string,
  count: rt.number,
  totalDocs: rt.number,
  percentage: rt.number,
});

export type DegradedDocs = rt.TypeOf<typeof degradedDocsRt>;

export const dataStreamSettingsRt = rt.partial({
  createdOn: rt.union([rt.null, rt.number]), // rt.null is needed because `createdOn` is not available on Serverless
});

export type DataStreamSettings = rt.TypeOf<typeof dataStreamSettingsRt>;

export const dataStreamDetailsRt = rt.partial({
  lastActivity: rt.number,
  degradedDocsCount: rt.number,
  docsCount: rt.number,
  sizeBytes: rt.union([rt.null, rt.number]), // rt.null is only needed for https://github.com/elastic/kibana/issues/178954
  services: rt.record(rt.string, rt.array(rt.string)),
  hosts: rt.record(rt.string, rt.array(rt.string)),
});

export type DataStreamDetails = rt.TypeOf<typeof dataStreamDetailsRt>;

export const getDataStreamsStatsResponseRt = rt.exact(
  rt.type({
    dataStreamsStats: rt.array(dataStreamStatRt),
  })
);

export const getDataStreamsDegradedDocsStatsResponseRt = rt.exact(
  rt.type({
    degradedDocs: rt.array(degradedDocsRt),
  })
);

export const getDataStreamsSettingsResponseRt = rt.exact(dataStreamSettingsRt);

export const getDataStreamsDetailsResponseRt = rt.exact(dataStreamDetailsRt);

export const dataStreamsEstimatedDataInBytesRT = rt.type({
  estimatedDataInBytes: rt.union([rt.number, rt.null]), // Null in serverless: https://github.com/elastic/kibana/issues/178954
});

export type DataStreamsEstimatedDataInBytes = rt.TypeOf<typeof dataStreamsEstimatedDataInBytesRT>;

export const getDataStreamsEstimatedDataInBytesResponseRt = rt.exact(
  dataStreamsEstimatedDataInBytesRT
);
