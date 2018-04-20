/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import clusterDataFixture from './fixtures/cluster_data';
import { handleResponse } from '../handle_response';

const { nodeStats, clusterStats, shardStats, timeOptions } = clusterDataFixture;
describe('map response of nodes data', () => {
  it('should handle empty parameters', () => {
    const result = handleResponse();
    expect(result).toEqual([]);
  });

  it('should handle empty clusterStats', () => {
    const result = handleResponse(
      nodeStats,
      undefined,
      shardStats,
      timeOptions
    );
    expect(result).toMatchSnapshot();
  });

  it('should handle empty shardStats', () => {
    const result = handleResponse(
      nodeStats,
      clusterStats,
      undefined,
      timeOptions
    );
    expect(result).toMatchSnapshot();
  });

  it('should handle empty time options', () => {
    const result = handleResponse(
      nodeStats,
      clusterStats,
      shardStats,
      undefined
    );

    expect(result).toMatchSnapshot();
  });

  it('should summarize response data, with cgroup metrics', () => {
    const result = handleResponse(
      nodeStats,
      clusterStats,
      shardStats,
      timeOptions
    );
    expect(result).toMatchSnapshot();
  });
});
