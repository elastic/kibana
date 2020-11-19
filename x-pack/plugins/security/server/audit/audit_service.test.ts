/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { AuditService, filterEvent, createLoggingConfig } from './audit_service';
import { AuditEvent, EventCategory, EventType, EventOutcome } from './audit_events';
import {
  coreMock,
  loggingSystemMock,
  httpServiceMock,
  httpServerMock,
} from 'src/core/server/mocks';
import { licenseMock } from '../../common/licensing/index.mock';
import { ConfigSchema, ConfigType } from '../config';
import { SecurityLicenseFeatures } from '../../common/licensing';
import { BehaviorSubject, Observable, of } from 'rxjs';

const createConfig = (settings: Partial<ConfigType['audit']>) => {
  return ConfigSchema.validate(settings);
};

const logger = loggingSystemMock.createLogger();
const license = licenseMock.create();
const config = createConfig({ enabled: true });
const { logging } = coreMock.createSetup();
const http = httpServiceMock.createSetupContract();
const getCurrentUser = jest.fn().mockReturnValue({ username: 'jdoe', roles: ['admin'] });
const getSpaceId = jest.fn().mockReturnValue('default');

beforeEach(() => {
  logger.info.mockClear();
  logging.configure.mockClear();
  http.registerOnPostAuth.mockClear();
});

describe('#setup', () => {
  it('returns the expected contract', () => {
    const auditService = new AuditService(logger);
    expect(
      auditService.setup({
        license,
        config,
        logging,
        http,
        getCurrentUser,
        getSpaceId,
      })
    ).toMatchInlineSnapshot(`
      Object {
        "asScoped": [Function],
        "getLogger": [Function],
      }
    `);
  });

  it('configures logging correctly when using ecs logger', async () => {
    new AuditService(logger).setup({
      license,
      config: {
        enabled: true,
        appender: {
          kind: 'console',
          layout: {
            kind: 'pattern',
          },
        },
      },
      logging,
      http,
      getCurrentUser,
      getSpaceId,
    });
    expect(logging.configure).toHaveBeenCalledWith(expect.any(Observable));
  });

  it('registers post auth hook', () => {
    new AuditService(logger).setup({
      license,
      config,
      logging,
      http,
      getCurrentUser,
      getSpaceId,
    });
    expect(http.registerOnPostAuth).toHaveBeenCalledWith(expect.any(Function));
  });
});

describe('#asScoped', () => {
  it('logs event enriched with meta data', async () => {
    const audit = new AuditService(logger).setup({
      license,
      config,
      logging,
      http,
      getCurrentUser,
      getSpaceId,
    });
    const request = httpServerMock.createKibanaRequest({
      kibanaRequestState: { requestId: 'REQUEST_ID', requestUuid: 'REQUEST_UUID' },
    });

    audit.asScoped(request).log({ message: 'MESSAGE', event: { action: 'ACTION' } });
    expect(logger.info).toHaveBeenCalledWith('MESSAGE', {
      event: { action: 'ACTION' },
      kibana: { space_id: 'default' },
      message: 'MESSAGE',
      trace: { id: 'REQUEST_ID' },
      user: { name: 'jdoe', roles: ['admin'] },
    });
  });

  it('does not log to audit logger if event matches ignore filter', async () => {
    const audit = new AuditService(logger).setup({
      license,
      config: {
        enabled: true,
        ignore_filters: [{ actions: ['ACTION'] }],
      },
      logging,
      http,
      getCurrentUser,
      getSpaceId,
    });
    const request = httpServerMock.createKibanaRequest({
      kibanaRequestState: { requestId: 'REQUEST_ID', requestUuid: 'REQUEST_UUID' },
    });

    audit.asScoped(request).log({ message: 'MESSAGE', event: { action: 'ACTION' } });
    expect(logger.info).not.toHaveBeenCalled();
  });

  it('does not log to audit logger if no event was generated', async () => {
    const audit = new AuditService(logger).setup({
      license,
      config: {
        enabled: true,
        ignore_filters: [{ actions: ['ACTION'] }],
      },
      logging,
      http,
      getCurrentUser,
      getSpaceId,
    });
    const request = httpServerMock.createKibanaRequest({
      kibanaRequestState: { requestId: 'REQUEST_ID', requestUuid: 'REQUEST_UUID' },
    });

    audit.asScoped(request).log(undefined);
    expect(logger.info).not.toHaveBeenCalled();
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
            kind: 'console',
            layout: {
              kind: 'pattern',
            },
          },
        })
      )
      .toPromise();

    expect(loggingConfig).toMatchInlineSnapshot(`
      Object {
        "appenders": Object {
          "auditTrailAppender": Object {
            "kind": "console",
            "layout": Object {
              "kind": "pattern",
            },
          },
        },
        "loggers": Array [
          Object {
            "appenders": Array [
              "auditTrailAppender",
            ],
            "context": "audit.ecs",
            "level": "info",
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
            kind: 'console',
            layout: {
              kind: 'pattern',
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
            kind: 'console',
            layout: {
              kind: 'pattern',
            },
          },
        })
      )
      .toPromise();

    expect(loggingConfig.loggers![0].level).toEqual('off');
  });
});

describe('#filterEvent', () => {
  const event: AuditEvent = {
    message: 'this is my audit message',
    event: {
      action: 'http_request',
      category: EventCategory.WEB,
      type: EventType.ACCESS,
      outcome: EventOutcome.SUCCESS,
    },
    user: {
      name: 'jdoe',
    },
    kibana: {
      space_id: 'default',
    },
  };

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
});

describe('#getLogger', () => {
  test('calls the underlying logger with the provided message and requisite tags', () => {
    const pluginId = 'foo';

    const licenseWithFeatures = licenseMock.create();
    licenseWithFeatures.features$ = new BehaviorSubject({
      allowAuditLogging: true,
    } as SecurityLicenseFeatures).asObservable();

    const auditService = new AuditService(logger).setup({
      license: licenseWithFeatures,
      config,
      logging,
      http,
      getCurrentUser,
      getSpaceId,
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
      allowAuditLogging: true,
    } as SecurityLicenseFeatures).asObservable();

    const auditService = new AuditService(logger).setup({
      license: licenseWithFeatures,
      config,
      logging,
      http,
      getCurrentUser,
      getSpaceId,
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
      allowAuditLogging: false,
    } as SecurityLicenseFeatures).asObservable();

    const auditService = new AuditService(logger).setup({
      license: licenseWithFeatures,
      config,
      logging,
      http,
      getCurrentUser,
      getSpaceId,
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
      allowAuditLogging: true,
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
      allowAuditLogging: false,
    } as SecurityLicenseFeatures);

    licenseWithFeatures.features$ = features$.asObservable();

    const auditService = new AuditService(logger).setup({
      license: licenseWithFeatures,
      config,
      logging,
      http,
      getCurrentUser,
      getSpaceId,
    });

    const auditLogger = auditService.getLogger(pluginId);

    const eventType = 'bar';
    const message = 'this is my audit message';
    auditLogger.log(eventType, message);

    expect(logger.info).not.toHaveBeenCalled();

    // perform license upgrade
    features$.next({
      allowAuditLogging: true,
    } as SecurityLicenseFeatures);

    auditLogger.log(eventType, message);

    expect(logger.info).toHaveBeenCalledTimes(1);
  });
});
