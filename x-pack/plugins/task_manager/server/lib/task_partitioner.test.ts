/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createDiscoveryServiceMock,
  createFindSO,
} from '../kibana_discovery_service/mock_kibana_discovery_service';
import { CACHE_INTERVAL, TaskPartitioner } from './task_partitioner';

const POD_NAME = 'test-pod';

describe('getAllPartitions()', () => {
  const discoveryServiceMock = createDiscoveryServiceMock(POD_NAME);
  test('correctly sets allPartitions in constructor', () => {
    const taskPartitioner = new TaskPartitioner(POD_NAME, discoveryServiceMock);
    expect(taskPartitioner.getAllPartitions()).toEqual([
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25,
      26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48,
      49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71,
      72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94,
      95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114,
      115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 127, 128, 129, 130, 131, 132, 133,
      134, 135, 136, 137, 138, 139, 140, 141, 142, 143, 144, 145, 146, 147, 148, 149, 150, 151, 152,
      153, 154, 155, 156, 157, 158, 159, 160, 161, 162, 163, 164, 165, 166, 167, 168, 169, 170, 171,
      172, 173, 174, 175, 176, 177, 178, 179, 180, 181, 182, 183, 184, 185, 186, 187, 188, 189, 190,
      191, 192, 193, 194, 195, 196, 197, 198, 199, 200, 201, 202, 203, 204, 205, 206, 207, 208, 209,
      210, 211, 212, 213, 214, 215, 216, 217, 218, 219, 220, 221, 222, 223, 224, 225, 226, 227, 228,
      229, 230, 231, 232, 233, 234, 235, 236, 237, 238, 239, 240, 241, 242, 243, 244, 245, 246, 247,
      248, 249, 250, 251, 252, 253, 254, 255,
    ]);
  });
});

describe('getPodName()', () => {
  const discoveryServiceMock = createDiscoveryServiceMock(POD_NAME);

  test('correctly sets podName in constructor', () => {
    const taskPartitioner = new TaskPartitioner(POD_NAME, discoveryServiceMock);
    expect(taskPartitioner.getPodName()).toEqual('test-pod');
  });
});

describe('getPartitions()', () => {
  const lastSeen = '2024-08-10T10:00:00.000Z';
  const discoveryServiceMock = createDiscoveryServiceMock(POD_NAME);
  const expectedPartitions = [
    0, 1, 3, 4, 6, 7, 9, 10, 12, 13, 15, 16, 18, 19, 21, 22, 24, 25, 27, 28, 30, 31, 33, 34, 36, 37,
    39, 40, 42, 43, 45, 46, 48, 49, 51, 52, 54, 55, 57, 58, 60, 61, 63, 64, 66, 67, 69, 70, 72, 73,
    75, 76, 78, 79, 81, 82, 84, 85, 87, 88, 90, 91, 93, 94, 96, 97, 99, 100, 102, 103, 105, 106,
    108, 109, 111, 112, 114, 115, 117, 118, 120, 121, 123, 124, 126, 127, 129, 130, 132, 133, 135,
    136, 138, 139, 141, 142, 144, 145, 147, 148, 150, 151, 153, 154, 156, 157, 159, 160, 162, 163,
    165, 166, 168, 169, 171, 172, 174, 175, 177, 178, 180, 181, 183, 184, 186, 187, 189, 190, 192,
    193, 195, 196, 198, 199, 201, 202, 204, 205, 207, 208, 210, 211, 213, 214, 216, 217, 219, 220,
    222, 223, 225, 226, 228, 229, 231, 232, 234, 235, 237, 238, 240, 241, 243, 244, 246, 247, 249,
    250, 252, 253, 255,
  ];

  beforeEach(() => {
    jest.useFakeTimers();
    discoveryServiceMock.getActiveKibanaNodes.mockResolvedValue([
      createFindSO(POD_NAME, lastSeen),
      createFindSO('test-pod-2', lastSeen),
      createFindSO('test-pod-3', lastSeen),
    ]);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  test('correctly gets the partitons for this pod', async () => {
    const taskPartitioner = new TaskPartitioner(POD_NAME, discoveryServiceMock);
    expect(await taskPartitioner.getPartitions()).toEqual(expectedPartitions);
  });

  test('correctly caches the partitions on 10 second interval', async () => {
    const taskPartitioner = new TaskPartitioner(POD_NAME, discoveryServiceMock);
    const shorterInterval = CACHE_INTERVAL / 2;

    await taskPartitioner.getPartitions();

    jest.advanceTimersByTime(shorterInterval);
    await taskPartitioner.getPartitions();

    jest.advanceTimersByTime(shorterInterval);
    await taskPartitioner.getPartitions();

    expect(discoveryServiceMock.getActiveKibanaNodes).toHaveBeenCalledTimes(2);
  });

  test('correctly catches the error from the discovery service and returns the cached value', async () => {
    const taskPartitioner = new TaskPartitioner(POD_NAME, discoveryServiceMock);

    await taskPartitioner.getPartitions();
    expect(taskPartitioner.getPodPartitions()).toEqual(expectedPartitions);

    discoveryServiceMock.getActiveKibanaNodes.mockRejectedValueOnce([]);
    jest.advanceTimersByTime(CACHE_INTERVAL);
    await taskPartitioner.getPartitions();
    expect(taskPartitioner.getPodPartitions()).toEqual(expectedPartitions);
  });
});
