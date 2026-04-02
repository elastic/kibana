/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LENS_METRIC_STATE_DEFAULTS } from '@kbn/lens-common';
import type { LensCreateRequestBody } from '@kbn/lens-plugin/server';

/** Sample data / FTR index pattern id (matches api_integration archives). */
const SAMPLE_DATA_VIEW_ID = '91200a00-9efd-11e7-acb3-3dab96693fab';

export const getExampleLensBody = (
  title = `Lens vis - ${Date.now()} - ${Math.random()}`,
  description = ''
): LensCreateRequestBody => ({
  type: 'metric',
  title,
  description,
  ignore_global_filters: false,
  sampling: 1,
  dataset: { type: 'dataView', id: SAMPLE_DATA_VIEW_ID },
  metrics: [
    {
      type: 'primary',
      operation: 'count',
      label: 'Count of records',
      empty_as_null: true,
      labels: { alignment: LENS_METRIC_STATE_DEFAULTS.titlesTextAlign },
      value: { alignment: LENS_METRIC_STATE_DEFAULTS.primaryAlign },
      fit: false,
    },
  ],
});
