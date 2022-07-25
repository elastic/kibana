/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import clusterDataFixture from './__fixtures__/cluster_data.json';
import { handleResponse } from './handle_response';

const { nodeStats, clusterStats, shardStats, timeOptions } = clusterDataFixture;
const pageOfNodes = [
  {
    uuid: '_x_V2YzPQU-a9KRRBxUxZQ',
    name: 'hello01',
  },
  {
    uuid: 'DAiX7fFjS3Wii7g2HYKrOg',
    name: 'hello02',
  },
];

describe('map response of nodes data', () => {
  it('should handle empty parameters', () => {
    const result = handleResponse();
    expect(result).toEqual([]);
  });

  it('should handle empty clusterStats', () => {
    const result = handleResponse(nodeStats, undefined, shardStats, pageOfNodes, timeOptions);
    expect(result).toMatchSnapshot();
  });

  it('should handle empty shardStats', () => {
    const result = handleResponse(nodeStats, clusterStats, undefined, pageOfNodes, timeOptions);
    expect(result).toMatchSnapshot();
  });

  it('should handle empty pageOfNodes', () => {
    const result = handleResponse(nodeStats, clusterStats, shardStats, [], timeOptions);
    expect(result).toMatchSnapshot();
  });

  it('should handle empty time options', () => {
    const result = handleResponse(nodeStats, clusterStats, shardStats, pageOfNodes, undefined);

    expect(result).toMatchSnapshot();
  });

  it('should summarize response data, with cgroup metrics', () => {
    const result = handleResponse(nodeStats, clusterStats, shardStats, pageOfNodes, timeOptions);
    expect(result).toMatchSnapshot();
  });
});
