/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { BehaviorSubject, Subject } from 'rxjs';
import { first } from 'rxjs/operators';
import { AuditTrailService, filterEvent, SetupParams } from './audit_trail_service';
import { coreMock, loggingSystemMock, httpServiceMock } from 'src/core/server/mocks';
import { AuditEvent } from 'src/core/server';

describe('AuditTrail plugin', () => {
  let coreSetup: ReturnType<typeof coreMock.createSetup>;
  let service: AuditTrailService;
  const license = {
    features$: new BehaviorSubject({
      showLogin: true,
      allowLogin: true,
      showLinks: true,
      showRoleMappingsManagement: true,
      allowAccessAgreement: true,
      allowAuditLogging: true,
      allowRoleDocumentLevelSecurity: true,
      allowRoleFieldLevelSecurity: true,
      allowRbac: true,
      allowSubFeaturePrivileges: true,
    }),
  };
  const config: SetupParams['config'] = {
    enabled: true,
    appender: {
      kind: 'console',
      layout: {
        kind: 'pattern',
      },
    },
  };
  const getCurrentUser = jest.fn();
  const getSpacesService = jest.fn();
  const logger = loggingSystemMock.createLogger();
  const http = httpServiceMock.createSetupContract();

  beforeEach(() => {
    service = new AuditTrailService(logger);
    coreSetup = coreMock.createSetup();
    logger.info.mockClear();
    http.registerOnPostAuth.mockClear();
  });

  afterEach(async () => {
    await service.stop();
  });

  describe('#setup', () => {
    it('registers AuditTrail factory', async () => {
      service.setup({
        license,
        config,
        http,
        logging: coreSetup.logging,
        auditTrail: coreSetup.auditTrail,
        getCurrentUser,
        getSpacesService,
      });
      expect(coreSetup.auditTrail.register).toHaveBeenCalledTimes(1);
    });

    it('registers post auth hook', async () => {
      service.setup({
        license,
        config,
        http,
        logging: coreSetup.logging,
        auditTrail: coreSetup.auditTrail,
        getCurrentUser,
        getSpacesService,
      });
      expect(http.registerOnPostAuth).toHaveBeenCalledTimes(1);
    });

    it('logs to audit trail if license allows', async () => {
      const event$: Subject<any> = (service as any).event$;
      service.setup({
        license,
        config,
        http,
        logging: coreSetup.logging,
        auditTrail: coreSetup.auditTrail,
        getCurrentUser,
        getSpacesService,
      });
      event$.next({ message: 'MESSAGE', other: 'OTHER' });
      expect(logger.info).toHaveBeenCalledWith('MESSAGE', { other: 'OTHER' });
    });

    it('does not log to audit trail if license does not allow', async () => {
      const event$: Subject<any> = (service as any).event$;
      service.setup({
        license: {
          features$: new BehaviorSubject({
            showLogin: true,
            allowLogin: true,
            showLinks: true,
            showRoleMappingsManagement: true,
            allowAccessAgreement: true,
            allowAuditLogging: false,
            allowRoleDocumentLevelSecurity: true,
            allowRoleFieldLevelSecurity: true,
            allowRbac: true,
            allowSubFeaturePrivileges: true,
          }),
        },
        config,
        http,
        logging: coreSetup.logging,
        auditTrail: coreSetup.auditTrail,
        getCurrentUser,
        getSpacesService,
      });
      event$.next({ message: 'MESSAGE', other: 'OTHER' });
      expect(logger.info).not.toHaveBeenCalled();
    });

    it('does not log to audit trail if event matches ignore filter', async () => {
      const event$: Subject<any> = (service as any).event$;
      service.setup({
        license,
        config: {
          enabled: true,
          ignore_filters: [{ actions: ['ACTION'] }],
          appender: {
            kind: 'console',
            layout: {
              kind: 'pattern',
            },
          },
        },
        http,
        logging: coreSetup.logging,
        auditTrail: coreSetup.auditTrail,
        getCurrentUser,
        getSpacesService,
      });
      event$.next({ message: 'MESSAGE', event: { action: 'ACTION' } });
      expect(logger.info).not.toHaveBeenCalled();
    });

    describe('logger', () => {
      it('registers a custom logger', async () => {
        service.setup({
          license,
          config,
          http,
          logging: coreSetup.logging,
          auditTrail: coreSetup.auditTrail,
          getCurrentUser,
          getSpacesService,
        });

        expect(coreSetup.logging.configure).toHaveBeenCalledTimes(1);
      });

      it('disables logging if config.enabled: false', async () => {
        service.setup({
          license,
          config: {
            enabled: false,
            appender: {
              kind: 'console',
              layout: {
                kind: 'pattern',
              },
            },
          },
          http,
          logging: coreSetup.logging,
          auditTrail: coreSetup.auditTrail,
          getCurrentUser,
          getSpacesService,
        });

        const args = coreSetup.logging.configure.mock.calls[0][0];
        const value = await args.pipe(first()).toPromise();
        expect(value.loggers?.every((l) => l.level === 'off')).toBe(true);
      });

      it('disables logging if config.appender: undefined', async () => {
        service.setup({
          license,
          config: {
            enabled: false,
            appender: undefined,
          },
          http,
          logging: coreSetup.logging,
          auditTrail: coreSetup.auditTrail,
          getCurrentUser,
          getSpacesService,
        });

        const args = coreSetup.logging.configure.mock.calls[0][0];
        const value = await args.pipe(first()).toPromise();
        expect(value.loggers?.every((l) => l.level === 'off')).toBe(true);
      });

      it('logs with DEBUG level if config.enabled: true', async () => {
        service.setup({
          license,
          config,
          http,
          logging: coreSetup.logging,
          auditTrail: coreSetup.auditTrail,
          getCurrentUser,
          getSpacesService,
        });

        const args = coreSetup.logging.configure.mock.calls[0][0];
        const value = await args.pipe(first()).toPromise();
        expect(value.loggers?.every((l) => l.level === 'info')).toBe(true);
      });

      it('uses appender adjusted via config', async () => {
        service.setup({
          license,
          config: {
            enabled: true,
            appender: {
              kind: 'file',
              path: '/path/to/file.txt',
              layout: {
                kind: 'json',
              },
            },
          },
          http,
          logging: coreSetup.logging,
          auditTrail: coreSetup.auditTrail,
          getCurrentUser,
          getSpacesService,
        });

        const args = coreSetup.logging.configure.mock.calls[0][0];
        const value = await args.pipe(first()).toPromise();
        expect(value.appenders).toEqual({
          auditTrailAppender: {
            kind: 'file',
            path: '/path/to/file.txt',
            layout: {
              kind: 'json',
            },
          },
        });
      });

      it('falls back to the default appender if not configured', async () => {
        service.setup({
          license,
          config: {
            enabled: true,
          },
          http,
          logging: coreSetup.logging,
          auditTrail: coreSetup.auditTrail,
          getCurrentUser,
          getSpacesService,
        });

        const args = coreSetup.logging.configure.mock.calls[0][0];
        const value = await args.pipe(first()).toPromise();
        expect(value.appenders).toEqual({
          auditTrailAppender: {
            kind: 'console',
            layout: {
              kind: 'pattern',
              highlight: true,
            },
          },
        });
      });
    });
  });
});

describe('#filterEvent', () => {
  const event: AuditEvent = {
    message: "HTTP request '/path' by user 'jdoe' succeeded",
    event: {
      action: 'http_request',
      category: 'web',
      type: 'access',
      outcome: 'success',
    },
    user: {
      name: 'jdoe',
    },
    kibana: {
      space_id: 'default',
    },
    trace: {
      id: 'TRACE_ID',
    },
  };

  test(`keeps events when ignore filters are undefined or empty`, () => {
    expect(filterEvent(event, undefined)).toBeTruthy();
    expect(filterEvent(event, [])).toBeTruthy();
  });

  test(`filters events correctly when a single match is found per criteria`, () => {
    expect(filterEvent(event, [{ actions: ['NO_MATCH'] }])).toBeTruthy();
    expect(filterEvent(event, [{ actions: ['NO_MATCH', 'http_request'] }])).toBeFalsy();
    expect(filterEvent(event, [{ categories: ['NO_MATCH', 'web'] }])).toBeFalsy();
    expect(filterEvent(event, [{ types: ['NO_MATCH', 'access'] }])).toBeFalsy();
    expect(filterEvent(event, [{ outcomes: ['NO_MATCH', 'success'] }])).toBeFalsy();
    expect(filterEvent(event, [{ spaces: ['NO_MATCH', 'default'] }])).toBeFalsy();
  });

  test(`keeps events when one criteria per rule does not match`, () => {
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

  test(`filters out event when all criteria in a single rule match`, () => {
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
