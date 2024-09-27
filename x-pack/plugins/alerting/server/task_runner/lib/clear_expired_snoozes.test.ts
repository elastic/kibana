/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import sinon from 'sinon';
import { Logger } from '@kbn/core/server';
import { loggingSystemMock, savedObjectsRepositoryMock } from '@kbn/core/server/mocks';
import { RuleSnooze } from '../../types';
import { RULE_SAVED_OBJECT_TYPE } from '../../saved_objects';
import { clearExpiredSnoozes } from './clear_expired_snoozes';

let clock: sinon.SinonFakeTimers;

const mockLogger = loggingSystemMock.create().get() as jest.Mocked<Logger>;
const internalSavedObjectsRepository = savedObjectsRepositoryMock.create();

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
      logger: mockLogger,
      rule: { ...attributes, id },
      savedObjectsClient: internalSavedObjectsRepository,
    });
    expect(internalSavedObjectsRepository.update).toHaveBeenCalledWith(
      RULE_SAVED_OBJECT_TYPE,
      '1',
      {
        updatedAt: '2019-02-12T21:01:22.479Z',
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
      {
        refresh: false,
      }
    );
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
      logger: mockLogger,
      rule: { ...attributes, id },
      savedObjectsClient: internalSavedObjectsRepository,
    });
    expect(internalSavedObjectsRepository.update).toHaveBeenCalledWith(
      RULE_SAVED_OBJECT_TYPE,
      '1',
      {
        updatedAt: '2019-02-12T21:01:22.479Z',
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
      {
        refresh: false,
      }
    );
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
      logger: mockLogger,
      rule: { ...attributes, id },
      savedObjectsClient: internalSavedObjectsRepository,
      version: '123',
    });
    expect(internalSavedObjectsRepository.update).toHaveBeenCalledWith(
      RULE_SAVED_OBJECT_TYPE,
      '1',
      {
        updatedAt: '2019-02-12T21:01:22.479Z',
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
      {
        refresh: false,
        version: '123',
      }
    );
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
      logger: mockLogger,
      rule: { ...attributes, id },
      savedObjectsClient: internalSavedObjectsRepository,
    });
    expect(internalSavedObjectsRepository.update).not.toHaveBeenCalled();
  });

  test('does nothing when empty snooze schedule', async () => {
    const { attributes, id } = getRule([]);
    await clearExpiredSnoozes({
      logger: mockLogger,
      rule: { ...attributes, id },
      savedObjectsClient: internalSavedObjectsRepository,
    });
    expect(internalSavedObjectsRepository.update).not.toHaveBeenCalled();
  });

  test('does nothing when undefined snooze schedule', async () => {
    const { attributes, id } = getRule(undefined);
    await clearExpiredSnoozes({
      logger: mockLogger,
      rule: { ...attributes, id },
      savedObjectsClient: internalSavedObjectsRepository,
    });
    expect(internalSavedObjectsRepository.update).not.toHaveBeenCalled();
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
  version: '123',
  references: [],
});
