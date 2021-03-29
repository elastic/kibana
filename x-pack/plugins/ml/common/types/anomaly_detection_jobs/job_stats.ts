/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { estypes } from '@elastic/elasticsearch';

export type JobStats = estypes.JobStats;

export type DataCounts = estypes.DataCounts;

export type ModelSizeStats = estypes.ModelSizeStats;

export type ForecastsStats = estypes.JobForecastStatistics;

export type Node = estypes.DiscoveryNode;

export type TimingStats = estypes.TimingStats;
