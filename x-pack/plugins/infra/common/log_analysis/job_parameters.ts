/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as rt from 'io-ts';

export const bucketSpan = 900000;

export const categoriesMessageField = 'message';

export const partitionField = 'event.dataset';

export const getJobIdPrefix = (spaceId: string, sourceId: string) =>
  `kibana-logs-ui-${spaceId}-${sourceId}-`;

export const getJobId = (spaceId: string, sourceId: string, jobType: string) =>
  `${getJobIdPrefix(spaceId, sourceId)}${jobType}`;

export const getDatafeedId = (spaceId: string, sourceId: string, jobType: string) =>
  `datafeed-${getJobId(spaceId, sourceId, jobType)}`;

export const datasetFilterRT = rt.union([
  rt.strict({
    type: rt.literal('includeAll'),
  }),
  rt.strict({
    type: rt.literal('includeSome'),
    datasets: rt.array(rt.string),
  }),
]);

export type DatasetFilter = rt.TypeOf<typeof datasetFilterRT>;

export const jobSourceConfigurationRT = rt.partial({
  indexPattern: rt.string,
  timestampField: rt.string,
  bucketSpan: rt.number,
  datasetFilter: datasetFilterRT,
});

export type JobSourceConfiguration = rt.TypeOf<typeof jobSourceConfigurationRT>;

export const jobCustomSettingsRT = rt.partial({
  job_revision: rt.number,
  logs_source_config: jobSourceConfigurationRT,
});

export type JobCustomSettings = rt.TypeOf<typeof jobCustomSettingsRT>;

export const combineDatasetFilters = (
  firstFilter: DatasetFilter,
  secondFilter: DatasetFilter
): DatasetFilter => {
  if (firstFilter.type === 'includeAll' && secondFilter.type === 'includeAll') {
    return {
      type: 'includeAll',
    };
  }

  const includedDatasets = new Set([
    ...(firstFilter.type === 'includeSome' ? firstFilter.datasets : []),
    ...(secondFilter.type === 'includeSome' ? secondFilter.datasets : []),
  ]);

  return {
    type: 'includeSome',
    datasets: [...includedDatasets],
  };
};

export const filterDatasetFilter = (
  datasetFilter: DatasetFilter,
  predicate: (dataset: string) => boolean
): DatasetFilter => {
  if (datasetFilter.type === 'includeAll') {
    return datasetFilter;
  } else {
    const newDatasets = datasetFilter.datasets.filter(predicate);

    if (newDatasets.length > 0) {
      return {
        type: 'includeSome',
        datasets: newDatasets,
      };
    } else {
      return {
        type: 'includeAll',
      };
    }
  }
};
