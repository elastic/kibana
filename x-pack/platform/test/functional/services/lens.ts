/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LENS_API_VERSION, LENS_VIS_API_PATH } from '@kbn/lens-plugin/common/constants';
import type { LensCreateRequestBody, LensCreateResponseBody } from '@kbn/lens-plugin/server';
import type { FtrProviderContext } from '../ftr_provider_context';

type MetricChartRequestBody = Extract<LensCreateRequestBody, { type: 'metric' }>;
type PrimaryMetric = Extract<
  MetricChartRequestBody['metrics'][number],
  { type: 'primary'; operation: string }
>;
type SecondaryMetric = Extract<
  MetricChartRequestBody['metrics'][number],
  { type: 'secondary'; operation: string }
>;

interface CreateMetricChartOptions {
  id?: string;
  title: string;
  dataViewId?: string;
  primaryMetric?: PrimaryMetric;
  secondaryMetric?: SecondaryMetric;
}

// TODO: Will be removed when moved to Scout
export function LensServiceProvider({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  return {
    async createMetricChart({
      id,
      title,
      dataViewId = 'logstash-*',
      primaryMetric = { type: 'primary', operation: 'average', field: 'bytes' },
      secondaryMetric = { type: 'secondary', operation: 'average', field: 'bytes' },
    }: CreateMetricChartOptions): Promise<LensCreateResponseBody> {
      const metrics: MetricChartRequestBody['metrics'] = secondaryMetric
        ? [primaryMetric, secondaryMetric]
        : [primaryMetric];
      const body: MetricChartRequestBody = {
        type: 'metric',
        title,
        data_source: { type: 'data_view_reference', ref_id: dataViewId },
        ignore_global_filters: false,
        sampling: 1 as const,
        metrics,
      };

      if (id) {
        const { body: createdVisualization } = await supertest
          .put(`${LENS_VIS_API_PATH}/${id}`)
          .set({
            'kbn-xsrf': 'true',
            'elastic-api-version': LENS_API_VERSION,
          })
          .send(body)
          .expect(201);

        return createdVisualization as LensCreateResponseBody;
      }

      const { body: createdVisualization } = await supertest
        .post(LENS_VIS_API_PATH)
        .set({
          'kbn-xsrf': 'true',
          'elastic-api-version': LENS_API_VERSION,
        })
        .send(body)
        .expect(201);

      return createdVisualization as LensCreateResponseBody;
    },
  };
}
