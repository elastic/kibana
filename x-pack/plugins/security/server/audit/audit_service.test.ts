/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { AuditService } from './audit_service';
import { loggingSystemMock } from 'src/core/server/mocks';
import { licenseMock } from '../../common/licensing/index.mock';
import { ConfigSchema, ConfigType } from '../config';
import { SecurityLicenseFeatures } from '../../common/licensing';
import { BehaviorSubject } from 'rxjs';

const createConfig = (settings: Partial<ConfigType['audit']>) => {
  return ConfigSchema.validate(settings);
};

const config = createConfig({
  enabled: true,
});

describe('#setup', () => {
  it('returns the expected contract', () => {
    const logger = loggingSystemMock.createLogger();
    const auditService = new AuditService(logger);
    const license = licenseMock.create();
    expect(auditService.setup({ license, config })).toMatchInlineSnapshot(`
      Object {
        "getLogger": [Function],
      }
    `);
  });
});

test(`calls the underlying logger with the provided message and requisite tags`, () => {
  const pluginId = 'foo';

  const logger = loggingSystemMock.createLogger();
  const license = licenseMock.create();
  license.features$ = new BehaviorSubject({
    allowAuditLogging: true,
  } as SecurityLicenseFeatures).asObservable();

  const auditService = new AuditService(logger).setup({ license, config });

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

test(`calls the underlying logger with the provided metadata`, () => {
  const pluginId = 'foo';

  const logger = loggingSystemMock.createLogger();
  const license = licenseMock.create();
  license.features$ = new BehaviorSubject({
    allowAuditLogging: true,
  } as SecurityLicenseFeatures).asObservable();

  const auditService = new AuditService(logger).setup({ license, config });

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

test(`does not call the underlying logger if license does not support audit logging`, () => {
  const pluginId = 'foo';

  const logger = loggingSystemMock.createLogger();
  const license = licenseMock.create();
  license.features$ = new BehaviorSubject({
    allowAuditLogging: false,
  } as SecurityLicenseFeatures).asObservable();

  const auditService = new AuditService(logger).setup({ license, config });

  const auditLogger = auditService.getLogger(pluginId);

  const eventType = 'bar';
  const message = 'this is my audit message';
  auditLogger.log(eventType, message);

  expect(logger.info).not.toHaveBeenCalled();
});

test(`does not call the underlying logger if security audit logging is not enabled`, () => {
  const pluginId = 'foo';

  const logger = loggingSystemMock.createLogger();
  const license = licenseMock.create();
  license.features$ = new BehaviorSubject({
    allowAuditLogging: true,
  } as SecurityLicenseFeatures).asObservable();

  const auditService = new AuditService(logger).setup({
    license,
    config: createConfig({
      enabled: false,
    }),
  });

  const auditLogger = auditService.getLogger(pluginId);

  const eventType = 'bar';
  const message = 'this is my audit message';
  auditLogger.log(eventType, message);

  expect(logger.info).not.toHaveBeenCalled();
});

test(`calls the underlying logger after license upgrade`, () => {
  const pluginId = 'foo';

  const logger = loggingSystemMock.createLogger();
  const license = licenseMock.create();

  const features$ = new BehaviorSubject({
    allowAuditLogging: false,
  } as SecurityLicenseFeatures);

  license.features$ = features$.asObservable();

  const auditService = new AuditService(logger).setup({ license, config });

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
