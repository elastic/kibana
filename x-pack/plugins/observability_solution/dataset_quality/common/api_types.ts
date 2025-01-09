/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';

const userPrivilegesRt = rt.type({
  canMonitor: rt.boolean,
});

const datasetUserPrivilegesRt = rt.intersection([
  userPrivilegesRt,
  rt.type({
    canRead: rt.boolean,
    canViewIntegrations: rt.boolean,
  }),
]);

export type DatasetUserPrivileges = rt.TypeOf<typeof datasetUserPrivilegesRt>;

export const dataStreamStatRt = rt.intersection([
  rt.type({
    name: rt.string,
    userPrivileges: userPrivilegesRt,
  }),
  rt.partial({
    size: rt.string,
    sizeBytes: rt.number,
    lastActivity: rt.number,
    integration: rt.string,
    totalDocs: rt.number,
  }),
]);

export type DataStreamStat = rt.TypeOf<typeof dataStreamStatRt>;

export const dataStreamDocsStatRt = rt.type({
  dataset: rt.string,
  count: rt.number,
});

export type DataStreamDocsStat = rt.TypeOf<typeof dataStreamDocsStatRt>;

export const getDataStreamTotalDocsResponseRt = rt.type({
  totalDocs: rt.array(dataStreamDocsStatRt),
});

export type DataStreamTotalDocsResponse = rt.TypeOf<typeof getDataStreamTotalDocsResponseRt>;

export const getDataStreamDegradedDocsResponseRt = rt.type({
  degradedDocs: rt.array(dataStreamDocsStatRt),
});

export type DataStreamDegradedDocsResponse = rt.TypeOf<typeof getDataStreamDegradedDocsResponseRt>;

export const getDataStreamFailedDocsResponseRt = rt.type({
  failedDocs: rt.array(dataStreamDocsStatRt),
});

export type DataStreamFailedDocsResponse = rt.TypeOf<typeof getDataStreamFailedDocsResponseRt>;

export const integrationDashboardRT = rt.type({
  id: rt.string,
  title: rt.string,
});

export type Dashboard = rt.TypeOf<typeof integrationDashboardRT>;

export const integrationDashboardsRT = rt.type({
  dashboards: rt.array(integrationDashboardRT),
});

export type IntegrationDashboardsResponse = rt.TypeOf<typeof integrationDashboardsRT>;

export const integrationIconRt = rt.intersection([
  rt.type({
    src: rt.string,
  }),
  rt.partial({
    path: rt.string,
    size: rt.string,
    title: rt.string,
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
  }),
]);

export type IntegrationType = rt.TypeOf<typeof integrationRt>;

export const getIntegrationsResponseRt = rt.exact(
  rt.type({
    integrations: rt.array(integrationRt),
  })
);

export type IntegrationResponse = rt.TypeOf<typeof getIntegrationsResponseRt>;

export const qualityIssueBaseRT = rt.type({
  count: rt.number,
  lastOccurrence: rt.union([rt.undefined, rt.null, rt.number]),
  timeSeries: rt.array(
    rt.type({
      x: rt.number,
      y: rt.number,
    })
  ),
});

export const qualityIssueRT = rt.intersection([
  qualityIssueBaseRT,
  rt.partial({
    name: rt.string,
    indexFieldWasLastPresentIn: rt.string,
  }),
  rt.type({
    name: rt.string,
    type: rt.keyof({
      degraded: null,
      failed: null,
    }),
  }),
]);

export type QualityIssue = rt.TypeOf<typeof qualityIssueRT>;

export type FailedDocsDetails = rt.TypeOf<typeof qualityIssueBaseRT>;

export const failedDocsErrorRt = rt.type({
  message: rt.string,
  type: rt.string,
});

export const failedDocsErrorsRt = rt.type({
  errors: rt.array(failedDocsErrorRt),
});

export type FailedDocsErrors = rt.TypeOf<typeof failedDocsErrorsRt>;

export const degradedFieldRt = rt.intersection([
  qualityIssueBaseRT,
  rt.type({
    name: rt.string,
    indexFieldWasLastPresentIn: rt.string,
  }),
]);

export type DegradedField = rt.TypeOf<typeof degradedFieldRt>;

export const getDataStreamDegradedFieldsResponseRt = rt.type({
  degradedFields: rt.array(degradedFieldRt),
});

export type DegradedFieldResponse = rt.TypeOf<typeof getDataStreamDegradedFieldsResponseRt>;

export const degradedFieldValuesRt = rt.type({
  field: rt.string,
  values: rt.array(rt.string),
});

export type DegradedFieldValues = rt.TypeOf<typeof degradedFieldValuesRt>;

export const degradedFieldAnalysisRt = rt.intersection([
  rt.type({
    isFieldLimitIssue: rt.boolean,
    fieldCount: rt.number,
    totalFieldLimit: rt.number,
  }),
  rt.partial({
    ignoreMalformed: rt.boolean,
    nestedFieldLimit: rt.number,
    fieldMapping: rt.partial({
      type: rt.string,
      ignore_above: rt.number,
    }),
    defaultPipeline: rt.string,
  }),
]);

export type DegradedFieldAnalysis = rt.TypeOf<typeof degradedFieldAnalysisRt>;

export const updateFieldLimitResponseRt = rt.intersection([
  rt.type({
    isComponentTemplateUpdated: rt.union([rt.boolean, rt.undefined]),
    isLatestBackingIndexUpdated: rt.union([rt.boolean, rt.undefined]),
    customComponentTemplateName: rt.string,
  }),
  rt.partial({
    error: rt.string,
  }),
]);

export type UpdateFieldLimitResponse = rt.TypeOf<typeof updateFieldLimitResponseRt>;

export const dataStreamRolloverResponseRt = rt.type({
  acknowledged: rt.boolean,
});

export type DataStreamRolloverResponse = rt.TypeOf<typeof dataStreamRolloverResponseRt>;

export const dataStreamSettingsRt = rt.partial({
  lastBackingIndexName: rt.string,
  indexTemplate: rt.string,
  createdOn: rt.union([rt.null, rt.number]), // rt.null is needed because `createdOn` is not available on Serverless
  integration: rt.string,
  datasetUserPrivileges: datasetUserPrivilegesRt,
});

export type DataStreamSettings = rt.TypeOf<typeof dataStreamSettingsRt>;

export const dataStreamDetailsRt = rt.partial({
  lastActivity: rt.number,
  degradedDocsCount: rt.number,
  failedDocsCount: rt.number,
  docsCount: rt.number,
  sizeBytes: rt.number,
  services: rt.record(rt.string, rt.array(rt.string)),
  hosts: rt.record(rt.string, rt.array(rt.string)),
  userPrivileges: userPrivilegesRt,
});

export type DataStreamDetails = rt.TypeOf<typeof dataStreamDetailsRt>;

export const getDataStreamsStatsResponseRt = rt.exact(
  rt.type({
    datasetUserPrivileges: datasetUserPrivilegesRt,
    dataStreamsStats: rt.array(dataStreamStatRt),
  })
);

export const getDataStreamsSettingsResponseRt = rt.exact(dataStreamSettingsRt);

export const getDataStreamsDetailsResponseRt = rt.exact(dataStreamDetailsRt);

export const dataStreamsEstimatedDataInBytesRT = rt.type({
  estimatedDataInBytes: rt.number,
});

export const getDataStreamsEstimatedDataInBytesResponseRt = rt.exact(
  dataStreamsEstimatedDataInBytesRT
);

export const getNonAggregatableDatasetsRt = rt.exact(
  rt.type({
    aggregatable: rt.boolean,
    datasets: rt.array(rt.string),
  })
);

export type NonAggregatableDatasets = rt.TypeOf<typeof getNonAggregatableDatasetsRt>;
