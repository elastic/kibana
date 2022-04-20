/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
function createNodeLevelMetricsMock() {
  return jest.fn().mockImplementation(() => {
    return {
      execution: jest.fn(),
      failure: jest.fn(),
      timeout: jest.fn(),
    };
  });
}

export const nodeLevelMetricsMock = {
  create: createNodeLevelMetricsMock(),
};
