/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from 'src/core/server';
import { loggingSystemMock } from 'src/core/server/mocks';

import type { TelemetryEventsSender } from '../telemetry/sender';
import { createMockTelemetryEventsSender } from '../telemetry/__mocks__';

import { sendTelemetryEvents, capErrorSize } from './upgrade_usage';
import type { PackagePolicyUpgradeUsage } from './upgrade_usage';

describe('sendTelemetryEvents', () => {
  let eventsTelemetryMock: jest.Mocked<TelemetryEventsSender>;
  let loggerMock: jest.Mocked<Logger>;

  beforeEach(() => {
    eventsTelemetryMock = createMockTelemetryEventsSender();
    loggerMock = loggingSystemMock.createLogger();
  });

  it('should queue telemetry events with generic error', () => {
    const upgardeMessage: PackagePolicyUpgradeUsage = {
      package_name: 'aws',
      current_version: '0.6.1',
      new_version: '1.3.0',
      status: 'failure',
      error: [
        { key: 'queueUrl', message: ['Queue URL is required'] },
        { message: 'Invalid format' },
      ],
      dryRun: true,
    };

    sendTelemetryEvents(loggerMock, eventsTelemetryMock, upgardeMessage);

    expect(eventsTelemetryMock.queueTelemetryEvents).toHaveBeenCalledWith('fleet-upgrades', [
      {
        current_version: '0.6.1',
        error: [
          {
            key: 'queueUrl',
            message: ['Queue URL is required'],
          },
          {
            message: 'Invalid format',
          },
        ],
        error_message: ['Field is required', 'Invalid format'],
        new_version: '1.3.0',
        package_name: 'aws',
        status: 'failure',
        dryRun: true,
      },
    ]);
  });

  it('should cap error size', () => {
    const maxSize = 2;
    const errors = [{ message: '1' }, { message: '2' }, { message: '3' }];

    const result = capErrorSize(errors, maxSize);

    expect(result.length).toEqual(maxSize);
  });
});
