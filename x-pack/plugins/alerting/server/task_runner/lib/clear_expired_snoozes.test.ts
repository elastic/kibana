/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import sinon from 'sinon';
import { Logger } from '@kbn/core/server';
import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { RuleSnooze } from '../../types';
import { RULE_SAVED_OBJECT_TYPE } from '../../saved_objects';
import { clearExpiredSnoozes } from './clear_expired_snoozes';
import { ALERTING_CASES_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';

let clock: sinon.SinonFakeTimers;

const mockLogger = loggingSystemMock.create().get() as jest.Mocked<Logger>;
const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

describe('clearExpiredSnoozes()', () => {
  beforeAll(() => {
    clock = sinon.useFakeTimers(new Date('2019-02-12T21:01:22.479Z'));
  });
  afterAll(() => clock.restore());

  beforeEach(() => {
    jest.clearAllMocks();
    clock.reset();
  });

  test('clears expired unscheduled snoozes and leaves unexpired scheduled snoozes', async () => {
    const { attributes, id } = getRule([
      {
        duration: 1000,
        rRule: {
          tzid: 'UTC',
          dtstart: moment().subtract(1, 'd').toISOString(),
          count: 1,
        },
      },
      {
        id: '1',
        duration: 1000,
        rRule: {
          tzid: 'UTC',
          dtstart: moment().add(1, 'd').toISOString(),
          count: 1,
        },
      },
    ]);
    await clearExpiredSnoozes({
      esClient,
      logger: mockLogger,
      rule: { ...attributes, id },
    });
    expect(esClient.update).toHaveBeenCalledWith({
      doc: {
        alert: {
          snoozeSchedule: [
            {
              duration: 1000,
              id: '1',
              rRule: {
                count: 1,
                dtstart: '2019-02-13T21:01:22.479Z',
                tzid: 'UTC',
              },
            },
          ],
        },
      },
      id: 'alert:1',
      index: ALERTING_CASES_SAVED_OBJECT_INDEX,
    });
  });

  test('clears expired scheduled snoozes and leaves unexpired ones', async () => {
    const { attributes, id } = getRule([
      {
        id: '1',
        duration: 1000,
        rRule: {
          tzid: 'UTC',
          dtstart: moment().subtract(1, 'd').toISOString(),
          count: 1,
        },
      },
      {
        id: '2',
        duration: 1000,
        rRule: {
          tzid: 'UTC',
          dtstart: moment().add(1, 'd').toISOString(),
          count: 1,
        },
      },
    ]);
    await clearExpiredSnoozes({
      esClient,
      logger: mockLogger,
      rule: { ...attributes, id },
    });
    expect(esClient.update).toHaveBeenCalledWith({
      doc: {
        alert: {
          snoozeSchedule: [
            {
              id: '2',
              duration: 1000,
              rRule: {
                tzid: 'UTC',
                dtstart: moment().add(1, 'd').toISOString(),
                count: 1,
              },
            },
          ],
        },
      },
      id: 'alert:1',
      index: ALERTING_CASES_SAVED_OBJECT_INDEX,
    });
  });

  test('passes version if provided', async () => {
    const { attributes, id } = getRule([
      {
        duration: 1000,
        rRule: {
          tzid: 'UTC',
          dtstart: moment().subtract(1, 'd').toISOString(),
          count: 1,
        },
      },
      {
        id: '1',
        duration: 1000,
        rRule: {
          tzid: 'UTC',
          dtstart: moment().add(1, 'd').toISOString(),
          count: 1,
        },
      },
    ]);
    await clearExpiredSnoozes({
      esClient,
      logger: mockLogger,
      rule: { ...attributes, id },
      version: 'WzQsMV0=',
    });
    expect(esClient.update).toHaveBeenCalledWith({
      doc: {
        alert: {
          snoozeSchedule: [
            {
              id: '1',
              duration: 1000,
              rRule: {
                tzid: 'UTC',
                dtstart: moment().add(1, 'd').toISOString(),
                count: 1,
              },
            },
          ],
        },
      },
      id: 'alert:1',
      if_primary_term: 1,
      if_seq_no: 4,
      index: ALERTING_CASES_SAVED_OBJECT_INDEX,
    });
  });

  test('does nothing when no snoozes are expired', async () => {
    const { attributes, id } = getRule([
      {
        duration: 1000 * 24 * 60 * 60 * 3, // 3 days
        rRule: {
          tzid: 'UTC',
          dtstart: moment().subtract(1, 'd').toISOString(),
          count: 1,
        },
      },
      {
        id: '2',
        duration: 1000,
        rRule: {
          tzid: 'UTC',
          dtstart: moment().add(1, 'd').toISOString(),
          count: 1,
        },
      },
    ]);
    await clearExpiredSnoozes({
      esClient,
      logger: mockLogger,
      rule: { ...attributes, id },
    });
    expect(esClient.update).not.toHaveBeenCalled();
  });

  test('does nothing when empty snooze schedule', async () => {
    const { attributes, id } = getRule([]);
    await clearExpiredSnoozes({
      esClient,
      logger: mockLogger,
      rule: { ...attributes, id },
    });
    expect(esClient.update).not.toHaveBeenCalled();
  });

  test('does nothing when undefined snooze schedule', async () => {
    const { attributes, id } = getRule(undefined);
    await clearExpiredSnoozes({
      esClient,
      logger: mockLogger,
      rule: { ...attributes, id },
    });
    expect(esClient.update).not.toHaveBeenCalled();
  });
});

const getRule = (snoozeSchedule: RuleSnooze | undefined) => ({
  id: '1',
  type: RULE_SAVED_OBJECT_TYPE,
  attributes: {
    name: 'name',
    consumer: 'myApp',
    schedule: { interval: '10s' },
    alertTypeId: 'myType',
    enabled: true,
    apiKey: 'MTIzOmFiYw==',
    apiKeyOwner: 'elastic',
    actions: [
      {
        group: 'default',
        id: '1',
        actionTypeId: '1',
        actionRef: '1',
        params: {
          foo: true,
        },
      },
    ],
    snoozeSchedule,
  },
  version: 'WzQsMV0=',
  references: [],
});
