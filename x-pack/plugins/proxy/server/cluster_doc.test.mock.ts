/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const mockClusterDocClient = jest.fn();

jest.mock('./cluster_doc', () => {
  const realClusterDocClient = jest.requireActual('./cluster_doc');

  return {
    ...realClusterDocClient,
    ClusterDocClient: mockClusterDocClient,
  };
});
