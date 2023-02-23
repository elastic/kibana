/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataFrameAnalyticsConfig } from '../../../../common/types/data_frame_analytics';

export const getDestinationIndex = (jobConfig: DataFrameAnalyticsConfig | undefined) =>
  (Array.isArray(jobConfig?.dest.index) ? jobConfig?.dest.index[0] : jobConfig?.dest.index) ?? '';
