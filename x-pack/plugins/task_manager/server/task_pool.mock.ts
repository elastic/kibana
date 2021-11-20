/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { TaskPool } from './task_pool';

const defaultGetCapacityOverride: () => Partial<{
  load: number;
  occupiedWorkers: number;
  workerLoad: number;
  max: number;
  availableWorkers: number;
}> = () => ({
  load: 0,
  occupiedWorkers: 0,
  workerLoad: 0,
  max: 10,
  availableWorkers: 10,
});

const createTaskPoolMock = (getCapacityOverride = defaultGetCapacityOverride) => {
  return {
    get load() {
      return getCapacityOverride().load ?? 0;
    },
    get occupiedWorkers() {
      return getCapacityOverride().occupiedWorkers ?? 0;
    },
    get workerLoad() {
      return getCapacityOverride().workerLoad ?? 0;
    },
    get max() {
      return getCapacityOverride().max ?? 10;
    },
    get availableWorkers() {
      return getCapacityOverride().availableWorkers ?? 10;
    },
    getOccupiedWorkersByType: jest.fn(),
    run: jest.fn(),
    cancelRunningTasks: jest.fn(),
  } as unknown as jest.Mocked<TaskPool>;
};

export const TaskPoolMock = {
  create: createTaskPoolMock,
};
