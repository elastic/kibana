/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
const createCapacityMock = () => {
  return jest.fn().mockImplementation(() => {
    return {
      determineTasksToRunBasedOnCapacity: jest.fn(),
      getUsedCapacityByType: jest.fn(),
      usedCapacityPercentage: jest.fn(),
      usedCapacity: jest.fn(),
      capacity: jest.fn(),
    };
  });
};

export const capacityMock = {
  create: createCapacityMock(),
};
