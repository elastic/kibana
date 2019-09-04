/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EventLogService } from './event_log_service';
import { getEsNames } from './es/names';
import { createMockEsContext } from './es/context.mock';
import { loggingServiceMock } from '../../../../src/core/server/logging/logging_service.mock';

const loggingService = loggingServiceMock.create();
const systemLogger = loggingService.get();

describe('EventLogService', () => {
  const esContext = createMockEsContext({
    esNames: getEsNames('ABC'),
    logger: systemLogger,
  });

  test('config', () => {
    let service: EventLogService;

    const params = {
      esContext,
      systemLogger,
      config: {
        enabled: true,
        logEntries: true,
        indexEntries: true,
      },
    };

    service = new EventLogService(params);
    expect(service.isEnabled()).toEqual(true);
    expect(service.isLoggingEntries()).toEqual(true);
    expect(service.isIndexingEntries()).toEqual(true);

    params.config.logEntries = false;
    service = new EventLogService(params);
    expect(service.isEnabled()).toEqual(true);
    expect(service.isLoggingEntries()).toEqual(false);
    expect(service.isIndexingEntries()).toEqual(true);

    params.config.logEntries = true;
    params.config.indexEntries = false;
    service = new EventLogService(params);
    expect(service.isEnabled()).toEqual(true);
    expect(service.isLoggingEntries()).toEqual(true);
    expect(service.isIndexingEntries()).toEqual(false);

    params.config.logEntries = false;
    params.config.indexEntries = false;
    service = new EventLogService(params);
    expect(service.isEnabled()).toEqual(true);
    expect(service.isLoggingEntries()).toEqual(false);
    expect(service.isIndexingEntries()).toEqual(false);

    params.config.enabled = false;
    params.config.logEntries = true;
    params.config.indexEntries = true;
    service = new EventLogService(params);
    expect(service.isEnabled()).toEqual(false);
    expect(service.isLoggingEntries()).toEqual(false);
    expect(service.isIndexingEntries()).toEqual(false);
  });

  test('provider actions', () => {
    const params = {
      esContext,
      systemLogger,
      config: {
        enabled: true,
        logEntries: true,
        indexEntries: true,
      },
    };

    const service = new EventLogService(params);
    let providerActions: ReturnType<EventLogService['getProviderActions']>;
    providerActions = service.getProviderActions();
    expect(providerActions.size).toEqual(0);

    service.registerProviderActions('foo', ['foo-1', 'foo-2']);
    providerActions = service.getProviderActions();
    expect(providerActions.size).toEqual(1);
    expect(providerActions.get('foo')).toEqual(new Set(['foo-1', 'foo-2']));

    expect(() => {
      service.registerProviderActions('invalid', []);
    }).toThrow('actions parameter must not be empty for provider: "invalid"');

    expect(() => {
      service.registerProviderActions('foo', ['abc']);
    }).toThrow('provider already registered: "foo"');
    expect(providerActions.get('foo')!.size).toEqual(2);

    expect(service.isProviderActionRegistered('foo', 'foo-1')).toEqual(true);
    expect(service.isProviderActionRegistered('foo', 'foo-2')).toEqual(true);
    expect(service.isProviderActionRegistered('foo', 'foo-3')).toEqual(false);
    expect(service.isProviderActionRegistered('invalid', 'foo')).toEqual(false);
  });

  test('getLogger()', () => {
    const params = {
      esContext,
      systemLogger,
      config: {
        enabled: true,
        logEntries: true,
        indexEntries: true,
      },
    };
    const service = new EventLogService(params);
    const eventLogger = service.getLogger({});
    expect(eventLogger).toBeTruthy();
  });
});
