/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { sha256 } from 'js-sha256';
import type { Logger } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { SavedObject } from '@kbn/core/server';
import {
  SyntheticsMonitor,
  ConfigKey,
  MonitorTypeEnum,
  ScheduleUnit,
  SourceType,
} from '../../../common/runtime_types/monitor_management';
import { DEFAULT_FIELDS } from '../../../common/constants/monitor_defaults';

import type { TelemetryEventsSender } from '../../telemetry/sender';
import { createMockTelemetryEventsSender } from '../../telemetry/__mocks__';

import { MONITOR_UPDATE_CHANNEL, MONITOR_CURRENT_CHANNEL } from '../../telemetry/constants';

import {
  formatTelemetryEvent,
  formatTelemetryUpdateEvent,
  formatTelemetryDeleteEvent,
  sendTelemetryEvents,
} from './monitor_upgrade_sender';

const stackVersion = '8.2.0';
const id = '123456';
const errors = [
  {
    locationId: 'us_central',
    error: {
      reason: 'my reason',
      status: 400,
    },
  },
];
const testConfig: SavedObject<SyntheticsMonitor> = {
  updated_at: '2011-10-05T14:48:00.000Z',
  id,
  attributes: {
    ...DEFAULT_FIELDS[MonitorTypeEnum.BROWSER],
    [ConfigKey.MONITOR_TYPE]: MonitorTypeEnum.HTTP,
    [ConfigKey.LOCATIONS]: [
      {
        id: 'us_central',
        label: 'US Central',
        url: 'testurl.com',
        geo: {
          lat: 0,
          lon: 0,
        },
        isServiceManaged: true,
      },
      {
        id: 'custom',
        label: 'Custom US Central',
        url: 'testurl.com',
        geo: {
          lat: 0,
          lon: 0,
        },
      },
    ],
    [ConfigKey.SCHEDULE]: { number: '3', unit: ScheduleUnit.MINUTES },
    [ConfigKey.URLS]: 'https://elastic.co',
    [ConfigKey.NAME]: 'Test',
    [ConfigKey.REVISION]: 1,
  } as SyntheticsMonitor,
} as SavedObject<SyntheticsMonitor>;
const createTestConfig = (extraConfigs: Record<string, any>, updatedAt?: string) => {
  return {
    ...testConfig,
    updated_at: updatedAt || testConfig.updated_at,
    attributes: {
      ...testConfig.attributes,
      ...extraConfigs,
    },
  } as SavedObject<SyntheticsMonitor>;
};

describe('monitor upgrade telemetry helpers', () => {
  it('formats telemetry events', () => {
    const actual = formatTelemetryEvent({
      monitor: testConfig,
      stackVersion,
      isInlineScript: false,
      errors,
    });
    expect(actual).toEqual({
      stackVersion,
      configId: sha256.create().update(testConfig.id).hex(),
      locations: ['us_central', 'other'],
      locationsCount: 2,
      monitorNameLength: testConfig.attributes[ConfigKey.NAME].length,
      updatedAt: testConfig.updated_at,
      type: testConfig.attributes[ConfigKey.MONITOR_TYPE],
      scriptType: undefined,
      monitorInterval: 180000,
      lastUpdatedAt: undefined,
      deletedAt: undefined,
      errors,
      durationSinceLastUpdated: undefined,
      revision: 1,
    });
  });

  it.each([
    [ConfigKey.MONITOR_SOURCE_TYPE, SourceType.PROJECT, 'project', false, false],
    [ConfigKey.SOURCE_INLINE, 'test', 'recorder', true, true],
    [ConfigKey.SOURCE_INLINE, 'test', 'inline', false, true],
  ])(
    'handles formatting scriptType for browser monitors',
    (config, value, scriptType, isRecorder, isInlineScript) => {
      const actual = formatTelemetryEvent({
        monitor: createTestConfig({
          [config]: value,
          [ConfigKey.METADATA]: {
            script_source: {
              is_generated_script: isRecorder,
            },
          },
        }),
        isInlineScript,
        stackVersion,
        errors,
      });
      expect(actual).toEqual({
        stackVersion,
        configId: sha256.create().update(testConfig.id).hex(),
        locations: ['us_central', 'other'],
        locationsCount: 2,
        monitorNameLength: testConfig.attributes[ConfigKey.NAME].length,
        updatedAt: testConfig.updated_at,
        type: testConfig.attributes[ConfigKey.MONITOR_TYPE],
        scriptType,
        monitorInterval: 180000,
        lastUpdatedAt: undefined,
        deletedAt: undefined,
        errors,
        durationSinceLastUpdated: undefined,
        revision: 1,
      });
    }
  );

  it('handles formatting update events', () => {
    const actual = formatTelemetryUpdateEvent(
      createTestConfig({}, '2011-10-05T16:48:00.000Z'),
      testConfig.updated_at,
      stackVersion,
      false,
      errors
    );
    expect(actual).toEqual({
      stackVersion,
      configId: sha256.create().update(testConfig.id).hex(),
      locations: ['us_central', 'other'],
      locationsCount: 2,
      monitorNameLength: testConfig.attributes[ConfigKey.NAME].length,
      updatedAt: '2011-10-05T16:48:00.000Z',
      type: testConfig.attributes[ConfigKey.MONITOR_TYPE],
      scriptType: undefined,
      monitorInterval: 180000,
      lastUpdatedAt: testConfig.updated_at,
      deletedAt: undefined,
      errors,
      durationSinceLastUpdated: 7200000,
      revision: 1,
    });
  });

  it('handles formatting delete events', () => {
    const actual = formatTelemetryDeleteEvent(
      testConfig,
      stackVersion,
      '2011-10-05T16:48:00.000Z',
      false,
      errors
    );
    expect(actual).toEqual({
      stackVersion,
      configId: sha256.create().update(testConfig.id).hex(),
      locations: ['us_central', 'other'],
      locationsCount: 2,
      monitorNameLength: testConfig.attributes[ConfigKey.NAME].length,
      updatedAt: '2011-10-05T16:48:00.000Z',
      type: testConfig.attributes[ConfigKey.MONITOR_TYPE],
      scriptType: undefined,
      monitorInterval: 180000,
      lastUpdatedAt: testConfig.updated_at,
      deletedAt: '2011-10-05T16:48:00.000Z',
      errors,
      durationSinceLastUpdated: 7200000,
      revision: 1,
    });
  });
});

describe('sendTelemetryEvents', () => {
  let eventsTelemetryMock: jest.Mocked<TelemetryEventsSender>;
  let loggerMock: jest.Mocked<Logger>;

  beforeEach(() => {
    eventsTelemetryMock = createMockTelemetryEventsSender();
    loggerMock = loggingSystemMock.createLogger();
  });

  it('should queue telemetry events with generic error', () => {
    const event = formatTelemetryEvent({
      monitor: testConfig,
      stackVersion,
      isInlineScript: true,
      errors,
    });
    sendTelemetryEvents(loggerMock, eventsTelemetryMock, event);

    expect(eventsTelemetryMock.queueTelemetryEvents).toHaveBeenCalledWith(MONITOR_UPDATE_CHANNEL, [
      event,
    ]);
    expect(eventsTelemetryMock.queueTelemetryEvents).toHaveBeenCalledWith(MONITOR_CURRENT_CHANNEL, [
      event,
    ]);
  });
});
