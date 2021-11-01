/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

export type JobStats = estypes.MlJobStats;

export type DataCounts = estypes.MlDataCounts;

export type ModelSizeStats = estypes.MlModelSizeStats;

export type TimingStats = estypes.MlTimingStats;

export type ForecastsStats = estypes.MlJobForecastStatistics;

export type Node = estypes.MlDiscoveryNode;
