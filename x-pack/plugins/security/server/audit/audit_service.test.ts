/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject, Observable, of } from 'rxjs';

import {
  coreMock,
  httpServerMock,
  httpServiceMock,
  loggingSystemMock,
} from 'src/core/server/mocks';

import type { SecurityLicenseFeatures } from '../../common/licensing';
import { licenseMock } from '../../common/licensing/index.mock';
import type { ConfigType } from '../config';
import { ConfigSchema } from '../config';
import type { AuditEvent } from './audit_events';
import {
  AuditService,
  createLoggingConfig,
  filterEvent,
  RECORD_USAGE_INTERVAL,
} from './audit_service';

jest.useFakeTimers({ legacyFakeTimers: true });

const createConfig = (settings: Partial<ConfigType['audit']>) => {
  return ConfigSchema.validate({ audit: settings }).audit;
};

const logger = loggingSystemMock.createLogger();
const license = licenseMock.create();
const config = createConfig({ enabled: true });
const { logging } = coreMock.createSetup();
const http = httpServiceMock.createSetupContract();
const getCurrentUser = jest.fn().mockReturnValue({ username: 'jdoe', roles: ['admin'] });
const getSpaceId = jest.fn().mockReturnValue('default');
const getSID = jest.fn().mockResolvedValue('SESSION_ID');
const recordAuditLoggingUsage = jest.fn();

beforeEach(() => {
  logger.info.mockClear();
  logging.configure.mockClear();
  recordAuditLoggingUsage.mockClear();
  http.registerOnPostAuth.mockClear();
});

describe('#setup', () => {
  it('returns the expected contract', () => {
    const audit = new AuditService(logger);
    expect(
      audit.setup({
        license,
        config,
        logging,
        http,
        getCurrentUser,
        getSpaceId,
        getSID,
        recordAuditLoggingUsage,
      })
    ).toMatchInlineSnapshot(`
      Object {
        "asScoped": [Function],
        "getLogger": [Function],
      }
    `);
    audit.stop();
  });

  it('configures logging correctly when using ecs logger', async () => {
    const audit = new AuditService(logger);
    audit.setup({
      license,
      config: {
        enabled: true,
        appender: {
          type: 'console',
          layout: {
            type: 'pattern',
          },
        },
      },
      logging,
      http,
      getCurrentUser,
      getSpaceId,
      getSID,
      recordAuditLoggingUsage,
    });
    expect(logging.configure).toHaveBeenCalledWith(expect.any(Observable));
    audit.stop();
  });

  it('records feature usage correctly when using ecs logger', async () => {
    const audit = new AuditService(logger);
    audit.setup({
      license: licenseMock.create({
        allowAuditLogging: true,
      }),
      config: {
        enabled: true,
        appender: {
          type: 'console',
          layout: {
            type: 'pattern',
          },
        },
      },
      logging,
      http,
      getCurrentUser,
      getSpaceId,
      getSID,
      recordAuditLoggingUsage,
    });
    expect(recordAuditLoggingUsage).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(RECORD_USAGE_INTERVAL);
    expect(recordAuditLoggingUsage).toHaveBeenCalledTimes(2);
    jest.advanceTimersByTime(RECORD_USAGE_INTERVAL);
    expect(recordAuditLoggingUsage).toHaveBeenCalledTimes(3);
    audit.stop();
  });

  it('does not record feature usage when disabled', async () => {
    const audit = new AuditService(logger);
    audit.setup({
      license,
      config: {
        enabled: false,
      },
      logging,
      http,
      getCurrentUser,
      getSpaceId,
      getSID,
      recordAuditLoggingUsage,
    });
    expect(recordAuditLoggingUsage).not.toHaveBeenCalled();
    jest.advanceTimersByTime(RECORD_USAGE_INTERVAL);
    expect(recordAuditLoggingUsage).not.toHaveBeenCalled();
    jest.advanceTimersByTime(RECORD_USAGE_INTERVAL);
    expect(recordAuditLoggingUsage).not.toHaveBeenCalled();
    audit.stop();
  });

  it('registers post auth hook', () => {
    const audit = new AuditService(logger);
    audit.setup({
      license,
      config,
      logging,
      http,
      getCurrentUser,
      getSpaceId,
      getSID,
      recordAuditLoggingUsage,
    });
    expect(http.registerOnPostAuth).toHaveBeenCalledWith(expect.any(Function));
    audit.stop();
  });
});

describe('#asScoped', () => {
  it('logs event enriched with meta data', async () => {
    const audit = new AuditService(logger);
    const auditSetup = audit.setup({
      license,
      config,
      logging,
      http,
      getCurrentUser,
      getSpaceId,
      getSID,
      recordAuditLoggingUsage,
    });
    const request = httpServerMock.createKibanaRequest({
      kibanaRequestState: { requestId: 'REQUEST_ID', requestUuid: 'REQUEST_UUID' },
    });

    await auditSetup.asScoped(request).log({ message: 'MESSAGE', event: { action: 'ACTION' } });
    expect(logger.info).toHaveBeenCalledWith('MESSAGE', {
      event: { action: 'ACTION' },
      kibana: { space_id: 'default', session_id: 'SESSION_ID' },
      trace: { id: 'REQUEST_ID' },
      user: { name: 'jdoe', roles: ['admin'] },
    });
    audit.stop();
  });

  it('does not log to audit logger if event matches ignore filter', async () => {
    const audit = new AuditService(logger);
    const auditSetup = audit.setup({
      license,
      config: {
        enabled: true,
        ignore_filters: [{ actions: ['ACTION'] }],
      },
      logging,
      http,
      getCurrentUser,
      getSpaceId,
      getSID,
      recordAuditLoggingUsage,
    });
    const request = httpServerMock.createKibanaRequest({
      kibanaRequestState: { requestId: 'REQUEST_ID', requestUuid: 'REQUEST_UUID' },
    });

    await auditSetup.asScoped(request).log({ message: 'MESSAGE', event: { action: 'ACTION' } });
    expect(logger.info).not.toHaveBeenCalled();
    audit.stop();
  });

  it('does not log to audit logger if no event was generated', async () => {
    const audit = new AuditService(logger);
    const auditSetup = audit.setup({
      license,
      config: {
        enabled: true,
        ignore_filters: [{ actions: ['ACTION'] }],
      },
      logging,
      http,
      getCurrentUser,
      getSpaceId,
      getSID,
      recordAuditLoggingUsage,
    });
    const request = httpServerMock.createKibanaRequest({
      kibanaRequestState: { requestId: 'REQUEST_ID', requestUuid: 'REQUEST_UUID' },
    });

    await auditSetup.asScoped(request).log(undefined);
    expect(logger.info).not.toHaveBeenCalled();
    audit.stop();
  });
});

describe('#createLoggingConfig', () => {
  test('sets log level to `info` when audit logging is enabled and appender is defined', async () => {
    const features$ = of({
      allowAuditLogging: true,
    });

    const loggingConfig = await features$
      .pipe(
        createLoggingConfig({
          enabled: true,
          appender: {
            type: 'console',
            layout: {
              type: 'pattern',
            },
          },
        })
      )
      .toPromise();

    expect(loggingConfig).toMatchInlineSnapshot(`
      Object {
        "appenders": Object {
          "auditTrailAppender": Object {
            "layout": Object {
              "type": "pattern",
            },
            "type": "console",
          },
        },
        "loggers": Array [
          Object {
            "appenders": Array [
              "auditTrailAppender",
            ],
            "level": "info",
            "name": "audit.ecs",
          },
        ],
      }
    `);
  });

  test('sets log level to `off` when audit logging is disabled', async () => {
    const features$ = of({
      allowAuditLogging: true,
    });

    const loggingConfig = await features$
      .pipe(
        createLoggingConfig({
          enabled: false,
          appender: {
            type: 'console',
            layout: {
              type: 'pattern',
            },
          },
        })
      )
      .toPromise();

    expect(loggingConfig.loggers![0].level).toEqual('off');
  });

  test('sets log level to `off` when appender is not defined', async () => {
    const features$ = of({
      allowAuditLogging: true,
    });

    const loggingConfig = await features$
      .pipe(
        createLoggingConfig({
          enabled: true,
        })
      )
      .toPromise();

    expect(loggingConfig.loggers![0].level).toEqual('off');
  });

  test('sets log level to `off` when license does not allow audit logging', async () => {
    const features$ = of({
      allowAuditLogging: false,
    });

    const loggingConfig = await features$
      .pipe(
        createLoggingConfig({
          enabled: true,
          appender: {
            type: 'console',
            layout: {
              type: 'pattern',
            },
          },
        })
      )
      .toPromise();

    expect(loggingConfig.loggers![0].level).toEqual('off');
  });
});

describe('#filterEvent', () => {
  let event: AuditEvent;

  beforeEach(() => {
    event = {
      message: 'this is my audit message',
      event: {
        action: 'http_request',
        category: ['web'],
        type: ['access'],
        outcome: 'success',
      },
      user: {
        name: 'jdoe',
      },
      kibana: {
        space_id: 'default',
      },
    };
  });

  test('keeps event when ignore filters are undefined or empty', () => {
    expect(filterEvent(event, undefined)).toBeTruthy();
    expect(filterEvent(event, [])).toBeTruthy();
  });

  test('filters event correctly when a single match is found per criteria', () => {
    expect(filterEvent(event, [{ actions: ['NO_MATCH'] }])).toBeTruthy();
    expect(filterEvent(event, [{ actions: ['NO_MATCH', 'http_request'] }])).toBeFalsy();
    expect(filterEvent(event, [{ categories: ['NO_MATCH', 'web'] }])).toBeFalsy();
    expect(filterEvent(event, [{ types: ['NO_MATCH', 'access'] }])).toBeFalsy();
    expect(filterEvent(event, [{ outcomes: ['NO_MATCH', 'success'] }])).toBeFalsy();
    expect(filterEvent(event, [{ spaces: ['NO_MATCH', 'default'] }])).toBeFalsy();
  });

  test('keeps event when one criteria per rule does not match', () => {
    expect(
      filterEvent(event, [
        {
          actions: ['NO_MATCH'],
          categories: ['web'],
          types: ['access'],
          outcomes: ['success'],
          spaces: ['default'],
        },
        {
          actions: ['http_request'],
          categories: ['NO_MATCH'],
          types: ['access'],
          outcomes: ['success'],
          spaces: ['default'],
        },
        {
          actions: ['http_request'],
          categories: ['web'],
          types: ['NO_MATCH'],
          outcomes: ['success'],
          spaces: ['default'],
        },
        {
          actions: ['http_request'],
          categories: ['web'],
          types: ['access'],
          outcomes: ['NO_MATCH'],
          spaces: ['default'],
        },
        {
          actions: ['http_request'],
          categories: ['web'],
          types: ['access'],
          outcomes: ['success'],
          spaces: ['NO_MATCH'],
        },
      ])
    ).toBeTruthy();
  });

  test('keeps event when one item per category does not match', () => {
    event = {
      message: 'this is my audit message',
      event: {
        action: 'http_request',
        category: ['authentication', 'web'],
        type: ['access'],
        outcome: 'success',
      },
      user: {
        name: 'jdoe',
      },
      kibana: {
        space_id: 'default',
      },
    };

    expect(
      filterEvent(event, [
        {
          actions: ['http_request'],
          categories: ['web', 'NO_MATCH'],
          types: ['access'],
          outcomes: ['success'],
          spaces: ['default'],
        },
      ])
    ).toBeTruthy();
  });

  test('keeps event when one item per type does not match', () => {
    event = {
      message: 'this is my audit message',
      event: {
        action: 'http_request',
        category: ['web'],
        type: ['access', 'user'],
        outcome: 'success',
      },
      user: {
        name: 'jdoe',
      },
      kibana: {
        space_id: 'default',
      },
    };

    expect(
      filterEvent(event, [
        {
          actions: ['http_request'],
          categories: ['web'],
          types: ['access', 'NO_MATCH'],
          outcomes: ['success'],
          spaces: ['default'],
        },
      ])
    ).toBeTruthy();
  });

  test('filters out event when all criteria in a single rule match', () => {
    expect(
      filterEvent(event, [
        {
          actions: ['NO_MATCH'],
          categories: ['NO_MATCH'],
          types: ['NO_MATCH'],
          outcomes: ['NO_MATCH'],
          spaces: ['NO_MATCH'],
        },
        {
          actions: ['http_request'],
          categories: ['web'],
          types: ['access'],
          outcomes: ['success'],
          spaces: ['default'],
        },
      ])
    ).toBeFalsy();
  });

  test('filters out event when all categories match', () => {
    event = {
      message: 'this is my audit message',
      event: {
        action: 'http_request',
        category: ['authentication', 'web'],
        type: ['access'],
        outcome: 'success',
      },
      user: {
        name: 'jdoe',
      },
      kibana: {
        space_id: 'default',
      },
    };

    expect(
      filterEvent(event, [
        {
          actions: ['http_request'],
          categories: ['authentication', 'web'],
          types: ['access'],
          outcomes: ['success'],
          spaces: ['default'],
        },
      ])
    ).toBeFalsy();
  });

  test('filters out event when all types match', () => {
    event = {
      message: 'this is my audit message',
      event: {
        action: 'http_request',
        category: ['web'],
        type: ['access', 'user'],
        outcome: 'success',
      },
      user: {
        name: 'jdoe',
      },
      kibana: {
        space_id: 'default',
      },
    };

    expect(
      filterEvent(event, [
        {
          actions: ['http_request'],
          categories: ['web'],
          types: ['access', 'user'],
          outcomes: ['success'],
          spaces: ['default'],
        },
      ])
    ).toBeFalsy();
  });
});

describe('#getLogger', () => {
  test('calls the underlying logger with the provided message and requisite tags', () => {
    const pluginId = 'foo';

    const licenseWithFeatures = licenseMock.create();
    licenseWithFeatures.features$ = new BehaviorSubject({
      allowLegacyAuditLogging: true,
    } as SecurityLicenseFeatures).asObservable();

    const auditService = new AuditService(logger).setup({
      license: licenseWithFeatures,
      config,
      logging,
      http,
      getCurrentUser,
      getSpaceId,
      getSID,
      recordAuditLoggingUsage,
    });

    const auditLogger = auditService.getLogger(pluginId);

    const eventType = 'bar';
    const message = 'this is my audit message';
    auditLogger.log(eventType, message);

    expect(logger.info).toHaveBeenCalledTimes(1);
    expect(logger.info).toHaveBeenCalledWith(message, {
      eventType,
      tags: [pluginId, eventType],
    });
  });

  test('calls the underlying logger with the provided metadata', () => {
    const pluginId = 'foo';

    const licenseWithFeatures = licenseMock.create();
    licenseWithFeatures.features$ = new BehaviorSubject({
      allowLegacyAuditLogging: true,
    } as SecurityLicenseFeatures).asObservable();

    const auditService = new AuditService(logger).setup({
      license: licenseWithFeatures,
      config,
      logging,
      http,
      getCurrentUser,
      getSpaceId,
      getSID,
      recordAuditLoggingUsage,
    });

    const auditLogger = auditService.getLogger(pluginId);

    const eventType = 'bar';
    const message = 'this is my audit message';
    const metadata = Object.freeze({
      property1: 'value1',
      property2: false,
      property3: 123,
    });
    auditLogger.log(eventType, message, metadata);

    expect(logger.info).toHaveBeenCalledTimes(1);
    expect(logger.info).toHaveBeenCalledWith(message, {
      eventType,
      tags: [pluginId, eventType],
      property1: 'value1',
      property2: false,
      property3: 123,
    });
  });

  test('does not call the underlying logger if license does not support audit logging', () => {
    const pluginId = 'foo';

    const licenseWithFeatures = licenseMock.create();
    licenseWithFeatures.features$ = new BehaviorSubject({
      allowLegacyAuditLogging: false,
    } as SecurityLicenseFeatures).asObservable();

    const auditService = new AuditService(logger).setup({
      license: licenseWithFeatures,
      config,
      logging,
      http,
      getCurrentUser,
      getSpaceId,
      getSID,
      recordAuditLoggingUsage,
    });

    const auditLogger = auditService.getLogger(pluginId);

    const eventType = 'bar';
    const message = 'this is my audit message';
    auditLogger.log(eventType, message);

    expect(logger.info).not.toHaveBeenCalled();
  });

  test('does not call the underlying logger if security audit logging is not enabled', () => {
    const pluginId = 'foo';

    const licenseWithFeatures = licenseMock.create();
    licenseWithFeatures.features$ = new BehaviorSubject({
      allowLegacyAuditLogging: true,
    } as SecurityLicenseFeatures).asObservable();

    const auditService = new AuditService(logger).setup({
      license: licenseWithFeatures,
      config: createConfig({
        enabled: false,
      }),
      logging,
      http,
      getCurrentUser,
      getSpaceId,
      getSID,
      recordAuditLoggingUsage,
    });

    const auditLogger = auditService.getLogger(pluginId);

    const eventType = 'bar';
    const message = 'this is my audit message';
    auditLogger.log(eventType, message);

    expect(logger.info).not.toHaveBeenCalled();
  });

  test('calls the underlying logger after license upgrade', () => {
    const pluginId = 'foo';

    const licenseWithFeatures = licenseMock.create();

    const features$ = new BehaviorSubject({
      allowLegacyAuditLogging: false,
    } as SecurityLicenseFeatures);

    licenseWithFeatures.features$ = features$.asObservable();

    const auditService = new AuditService(logger).setup({
      license: licenseWithFeatures,
      config,
      logging,
      http,
      getCurrentUser,
      getSpaceId,
      getSID,
      recordAuditLoggingUsage,
    });

    const auditLogger = auditService.getLogger(pluginId);

    const eventType = 'bar';
    const message = 'this is my audit message';
    auditLogger.log(eventType, message);

    expect(logger.info).not.toHaveBeenCalled();

    // perform license upgrade
    features$.next({
      allowLegacyAuditLogging: true,
    } as SecurityLicenseFeatures);

    auditLogger.log(eventType, message);

    expect(logger.info).toHaveBeenCalledTimes(1);
  });
});
