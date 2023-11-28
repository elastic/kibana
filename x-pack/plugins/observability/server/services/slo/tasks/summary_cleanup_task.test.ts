/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDeleteQueryFilter, SloSummaryCleanupTask } from './summary_cleanup_task';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';

import { loggerMock } from '@kbn/logging-mocks';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { cloneDeep, times } from 'lodash';

const taskManagerSetup = taskManagerMock.createSetup();
const taskManagerStart = taskManagerMock.createStart();
const logger = loggerMock.create();
const soClient = savedObjectsClientMock.create();
const esClient = elasticsearchClientMock.createClusterClient().asInternalUser;

const SEPARATOR = '__V__';

describe('SloSummaryCleanupTask', () => {
  it('should run for empty', async function () {
    const task = new SloSummaryCleanupTask(taskManagerSetup, logger);
    soClient.createPointInTimeFinder = mockSOClientFinder();
    await task.start(taskManagerStart, soClient, esClient);
    await task.runTask();
  });

  it('should run some slos', async function () {
    const task = new SloSummaryCleanupTask(taskManagerSetup, logger);
    soClient.createPointInTimeFinder = mockSOClientFinder({
      slos: [
        { attributes: { id: '1', revision: 1 } },
        { attributes: { id: '2', revision: 1 } },
        {
          attributes: { id: '3', revision: 1 },
        },
        {
          attributes: { id: '3', revision: 2 },
        },
      ],
    });
    task.fetchSloSummariesIds = jest.fn().mockReturnValue({
      sloSummaryIds: [
        `1${SEPARATOR}1`,
        `2${SEPARATOR}1`,
        `3${SEPARATOR}2`,
        '4',
        `3${SEPARATOR}1`,
        `3${SEPARATOR}0`,
      ],
    });
    await task.start(taskManagerStart, soClient, esClient);
    await task.runTask();

    expect(task.fetchSloSummariesIds).toHaveBeenCalled();
    expect(esClient.deleteByQuery).toHaveBeenCalledWith({
      index: '.slo-observability.summary-v2*',
      query: {
        bool: {
          should: [
            {
              bool: {
                must: [
                  {
                    term: {
                      'slo.id': '3',
                    },
                  },
                  {
                    term: {
                      'slo.revision': 0,
                    },
                  },
                ],
              },
            },
            {
              bool: {
                must: [
                  {
                    term: {
                      'slo.id': '4',
                    },
                  },
                  {
                    term: {
                      'slo.revision': NaN,
                    },
                  },
                ],
              },
            },
          ],
        },
      },
    });
  });

  it('should run lots of slos', async function () {
    const task = new SloSummaryCleanupTask(taskManagerSetup, logger);
    soClient.createPointInTimeFinder = mockSOClientFinder({
      slos: times(10000, (i) => ({
        attributes: { id: `${i}`, revision: 'v1' },
      })),
    });
    task.fetchSloSummariesIds = jest.fn().mockReturnValue({
      sloSummaryIds: [
        '01',
        '02',
        '03',
        '04',
        `1${SEPARATOR}v1`,
        `2${SEPARATOR}v1`,
        `3${SEPARATOR}v1`,
        `4${SEPARATOR}v1`,
      ],
    });
    await task.start(taskManagerStart, soClient, esClient);
    await task.runTask();

    expect(task.fetchSloSummariesIds).toHaveBeenCalledTimes(1);
    expect(esClient.deleteByQuery).toHaveBeenCalledWith({
      index: '.slo-observability.summary-v2*',
      query: {
        bool: {
          should: getDeleteQueryFilter(['01', '02', '03', '04']),
        },
      },
    });
  });

  it('should run when lots of slo defs are there', async function () {
    const task = new SloSummaryCleanupTask(taskManagerSetup, logger);
    soClient.createPointInTimeFinder = mockSOClientFinder({
      slos: times(10000, (i) => ({
        attributes: { id: `${i}`, revision: 'v2' },
      })),
    });
    task.fetchSloSummariesIds = jest.fn().mockImplementation(async (searchKey) => {
      if (!searchKey) {
        return {
          sloSummaryIds: [
            `1${SEPARATOR}v2`,
            `2${SEPARATOR}v2`,
            `3${SEPARATOR}v2`,
            `4${SEPARATOR}v2`,
            `01${SEPARATOR}v1`,
            `02${SEPARATOR}v1`,
            `03${SEPARATOR}v1`,
            `04${SEPARATOR}v1`,
          ],
          searchAfter: '1',
        };
      }
      return {
        sloSummaryIds: [
          `5${SEPARATOR}v2`,
          `6${SEPARATOR}v2`,
          `7${SEPARATOR}v2`,
          `8${SEPARATOR}v2`,
          `05${SEPARATOR}v1`,
          `06${SEPARATOR}v1`,
          `07${SEPARATOR}v1`,
          `08${SEPARATOR}v1`,
        ],
      };
    });
    await task.start(taskManagerStart, soClient, esClient);
    await task.runTask();

    expect(task.fetchSloSummariesIds).toHaveBeenCalledTimes(2);
    expect(esClient.deleteByQuery).toHaveBeenCalledWith({
      index: '.slo-observability.summary-v2*',
      query: {
        bool: {
          should: getDeleteQueryFilter([
            `01${SEPARATOR}v1`,
            `02${SEPARATOR}v1`,
            `03${SEPARATOR}v1`,
            `04${SEPARATOR}v1`,
            `05${SEPARATOR}v1`,
            `06${SEPARATOR}v1`,
            `07${SEPARATOR}v1`,
            `08${SEPARATOR}v1`,
          ]),
        },
      },
    });
  });

  it('should run when summaries are way more then defs', async function () {
    const task = new SloSummaryCleanupTask(taskManagerSetup, logger);
    soClient.createPointInTimeFinder = mockSOClientFinder({
      slos: times(100, (i) => ({
        attributes: { id: `${i}`, revision: 'v2' },
      })),
    });
    task.fetchSloSummariesIds = jest.fn().mockImplementation(async (searchKey) => {
      if (!searchKey) {
        return {
          sloSummaryIds: [
            `1${SEPARATOR}v2`,
            `2${SEPARATOR}v2`,
            `3${SEPARATOR}v2`,
            `4${SEPARATOR}v2`,
            `01${SEPARATOR}v1`,
            `02${SEPARATOR}v1`,
            `03${SEPARATOR}v1`,
            `04${SEPARATOR}v1`,
          ],
          searchAfter: '1',
        };
      }
      return {
        sloSummaryIds: [
          `5${SEPARATOR}v2`,
          `6${SEPARATOR}v2`,
          `7${SEPARATOR}v2`,
          `8${SEPARATOR}v2`,
          `05${SEPARATOR}v1`,
          `06${SEPARATOR}v1`,
          `07${SEPARATOR}v1`,
          `08${SEPARATOR}v1`,
        ],
      };
    });
    await task.start(taskManagerStart, soClient, esClient);
    await task.runTask();

    expect(task.fetchSloSummariesIds).toHaveBeenCalledTimes(2);
    expect(esClient.deleteByQuery).toHaveBeenCalledWith({
      index: '.slo-observability.summary-v2*',
      query: {
        bool: {
          should: getDeleteQueryFilter([
            `01${SEPARATOR}v1`,
            `02${SEPARATOR}v1`,
            `03${SEPARATOR}v1`,
            `04${SEPARATOR}v1`,
            `05${SEPARATOR}v1`,
            `06${SEPARATOR}v1`,
            `07${SEPARATOR}v1`,
            `08${SEPARATOR}v1`,
          ]),
        },
      },
    });
  });

  it('should run when there are no Slo defs', async function () {
    const task = new SloSummaryCleanupTask(taskManagerSetup, logger);
    soClient.createPointInTimeFinder = mockSOClientFinder();
    task.fetchSloSummariesIds = jest.fn().mockImplementation(async (searchKey) => {
      if (!searchKey) {
        return {
          sloSummaryIds: [
            `1${SEPARATOR}v2`,
            `2${SEPARATOR}v2`,
            `3${SEPARATOR}v2`,
            `4${SEPARATOR}v2`,
            `01${SEPARATOR}v1`,
            `02${SEPARATOR}v1`,
            `03${SEPARATOR}v1`,
            `04${SEPARATOR}v1`,
          ],
          searchAfter: '1',
        };
      }
      return {
        sloSummaryIds: [
          `5${SEPARATOR}v2`,
          `6${SEPARATOR}v2`,
          `7${SEPARATOR}v2`,
          `8${SEPARATOR}v2`,
          `05${SEPARATOR}v1`,
          `06${SEPARATOR}v1`,
          `07${SEPARATOR}v1`,
          `08${SEPARATOR}v1`,
        ],
      };
    });
    await task.start(taskManagerStart, soClient, esClient);
    await task.runTask();

    expect(task.fetchSloSummariesIds).toHaveBeenCalledTimes(2);
    expect(esClient.deleteByQuery).toHaveBeenCalledWith({
      index: '.slo-observability.summary-v2*',
      query: {
        bool: {
          should: getDeleteQueryFilter([
            `01${SEPARATOR}v1`,
            `02${SEPARATOR}v1`,
            `03${SEPARATOR}v1`,
            `04${SEPARATOR}v1`,
            `05${SEPARATOR}v1`,
            `06${SEPARATOR}v1`,
            `07${SEPARATOR}v1`,
            `08${SEPARATOR}v1`,
          ]),
        },
      },
    });
  });
});

export const mockSOClientFinder = ({ slos = null }: { slos?: any } = {}) => {
  const result = cloneDeep(slos);
  return jest.fn().mockImplementation(({ perPage, type: soType }) => ({
    close: jest.fn(),
    find: jest.fn().mockReturnValue({
      async *[Symbol.asyncIterator]() {
        if (!perPage) {
          yield {
            saved_objects: result,
          };
          return;
        }
        if (slos === null) {
          return;
        }
        do {
          const currentPage = result.splice(0, perPage);
          if (currentPage.length === 0) {
            return;
          }
          yield {
            saved_objects: currentPage,
          };
        } while (result.length > 0);
      },
    }),
  }));
};
