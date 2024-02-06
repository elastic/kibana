/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataStreamStat } from '../../common/data_streams_stats';

interface FilterInactiveDatasetsOptions {
  datasets: DataStreamStat[];
  timeRange: {
    from: string;
    to: string;
  };
}

export const filterInactiveDatasets = (options: FilterInactiveDatasetsOptions) => {
  const {
    datasets,
    timeRange: { from, to },
  } = options;

  const startDate = new Date(from).getTime();
  const endDate = new Date(to).getTime();

  return datasets.filter((dataset) =>
    dataset.lastActivity ? isActive(dataset.lastActivity, startDate, endDate) : false
  );
};

interface IsActiveDatasetOptions {
  lastActivity: number;
  timeRange: {
    from: string;
    to: string;
  };
}

export const isActiveDataset = (options: IsActiveDatasetOptions) => {
  const {
    lastActivity,
    timeRange: { from, to },
  } = options;

  const startDate = new Date(from).getTime();
  const endDate = new Date(to).getTime();

  return isActive(lastActivity, startDate, endDate);
};

const isActive = (lastActivity: number, startDate: number, endDate: number) =>
  lastActivity >= startDate && lastActivity <= endDate;
