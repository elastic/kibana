/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { TaskPool } from './task_pool';

const defaultGetCapacityOverride: () => Partial<{
  load: number;
  occupiedCapacity: number;
  capacityLoad: number;
  max: number;
  availableCapacity: number;
}> = () => ({
  load: 0,
  occupiedCapacity: 0,
  capacityLoad: 0,
  max: 10,
  availableCapacity: 20,
});

const createTaskPoolMock = (getCapacityOverride = defaultGetCapacityOverride) => {
  return {
    get load() {
      return getCapacityOverride().load ?? 0;
    },
    get occupiedCapacity() {
      return getCapacityOverride().occupiedCapacity ?? 0;
    },
    get capacityLoad() {
      return getCapacityOverride().capacityLoad ?? 0;
    },
    get max() {
      return getCapacityOverride().max ?? 10;
    },
    get availableCapacity() {
      return getCapacityOverride().availableCapacity ?? 10;
    },
    getOccupiedCapacityByType: jest.fn(),
    run: jest.fn(),
    cancelRunningTasks: jest.fn(),
  } as unknown as jest.Mocked<TaskPool>;
};

export const TaskPoolMock = {
  create: createTaskPoolMock,
};
