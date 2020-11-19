/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { set } from '@elastic/safer-lodash-set';
import expect from '@kbn/expect';
import { handleResponse } from '../get_ml_jobs';

describe('Get ML Jobs', () => {
  it('returns empty array when there are no hits', () => {
    const jobStats = [];
    const result = handleResponse(jobStats);
    expect(result).to.eql([]);
  });
  it('maps out the inner result data when there are a few hits', () => {
    const jobStats = [];
    set(jobStats, 'hits.hits[0]._source.job_stats', {
      job_id: 'job_id_uno',
      state: 'opened',
      data_counts: { processed_record_count: 1 },
      model_size_stats: { model_bytes: 293847 },
      forecasts_stats: { total: 5 },
      node: { id: 'node-01', name: 'nameOfNode1' },
    });
    set(jobStats, 'hits.hits[1]._source.job_stats', {
      job_id: 'job_id_dos',
      state: 'opened',
      data_counts: { processed_record_count: 3 },
      model_size_stats: { model_bytes: 39045 },
      forecasts_stats: { total: 0 },
      node: { id: 'node-02', name: 'nameOfNode2' },
    });
    set(jobStats, 'hits.hits[2]._source.job_stats', {
      job_id: 'job_id_tres',
      state: 'opened',
      data_counts: { processed_record_count: 5 },
      model_size_stats: { model_bytes: 983457 },
      forecasts_stats: { total: 4 },
      node: { id: 'node-03', name: 'nameOfNode3' },
    });

    const result = handleResponse(jobStats);
    expect(result).to.eql([
      {
        job_id: 'job_id_uno',
        state: 'opened',
        data_counts: { processed_record_count: 1 },
        model_size_stats: { model_bytes: 293847 },
        forecasts_stats: { total: 5 },
        node: { id: 'node-01', name: 'nameOfNode1' },
      },
      {
        job_id: 'job_id_dos',
        state: 'opened',
        data_counts: { processed_record_count: 3 },
        model_size_stats: { model_bytes: 39045 },
        forecasts_stats: { total: 0 },
        node: { id: 'node-02', name: 'nameOfNode2' },
      },
      {
        job_id: 'job_id_tres',
        state: 'opened',
        data_counts: { processed_record_count: 5 },
        model_size_stats: { model_bytes: 983457 },
        forecasts_stats: { total: 4 },
        node: { id: 'node-03', name: 'nameOfNode3' },
      },
    ]);
  });
});
