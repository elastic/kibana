/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Telemetry } from './telemetry';
import {
  REPORT_INTERVAL_MS,
  LOCALSTORAGE_KEY,
} from '../../common/constants';

describe('telemetry class', () => {

  const clusters = [
    { cluster_uuid: 'fake-123' },
    { cluster_uuid: 'fake-456' },
  ];
  const telemetryUrl = 'https://not.a.valid.url.0';
  const mockFetchTelemetry = () => Promise.resolve({ data: clusters });
  // returns a function that behaves like the injector by fetching the requested key from the object directly
  // for example:
  // { '$http': jest.fn() } would be how to mock the '$http' injector value
  const mockInjectorFromObject = object => {
    return { get: key => object[key] };
  };

  describe('constructor', () => {

    test('defaults lastReport if unset', () => {
      const injector = {
        localStorage: {
          get: jest.fn().mockReturnValueOnce(undefined),
        },
        '$http': jest.fn(),
        telemetryOptedIn: true,
        telemetryUrl,
      };
      const telemetry = new Telemetry(mockInjectorFromObject(injector), mockFetchTelemetry);

      expect(telemetry._storage).toBe(injector.localStorage);
      expect(telemetry._$http).toBe(injector.$http);
      expect(telemetry._telemetryOptedIn).toBe(injector.telemetryOptedIn);
      expect(telemetry._telemetryUrl).toBe(injector.telemetryUrl);
      expect(telemetry._fetchTelemetry).toBe(mockFetchTelemetry);
      expect(telemetry._sending).toBe(false);
      expect(telemetry._lastReport).toBeUndefined();

      expect(injector.localStorage.get).toHaveBeenCalledTimes(1);
      expect(injector.localStorage.get).toHaveBeenCalledWith(LOCALSTORAGE_KEY);
    });

    test('uses lastReport if set', () => {
      const lastReport = Date.now();
      const injector = {
        localStorage: {
          get: jest.fn().mockReturnValueOnce({ lastReport }),
        },
        '$http': jest.fn(),
        telemetryOptedIn: true,
        telemetryUrl,
      };
      const telemetry = new Telemetry(mockInjectorFromObject(injector), mockFetchTelemetry);

      expect(telemetry._storage).toBe(injector.localStorage);
      expect(telemetry._$http).toBe(injector.$http);
      expect(telemetry._telemetryOptedIn).toBe(injector.telemetryOptedIn);
      expect(telemetry._telemetryUrl).toBe(injector.telemetryUrl);
      expect(telemetry._fetchTelemetry).toBe(mockFetchTelemetry);
      expect(telemetry._sending).toBe(false);
      expect(telemetry._lastReport).toBe(lastReport);

      expect(injector.localStorage.get).toHaveBeenCalledTimes(1);
      expect(injector.localStorage.get).toHaveBeenCalledWith(LOCALSTORAGE_KEY);
    });

  });

  test('_saveToBrowser uses _lastReport', () => {
    const injector = {
      localStorage: {
        get: jest.fn().mockReturnValueOnce({ random: 'junk', gets: 'thrown away' }),
        set: jest.fn(),
      }
    };
    const lastReport = Date.now();
    const telemetry = new Telemetry(mockInjectorFromObject(injector), mockFetchTelemetry);
    telemetry._lastReport = lastReport;

    telemetry._saveToBrowser();

    expect(injector.localStorage.set).toHaveBeenCalledTimes(1);
    expect(injector.localStorage.set).toHaveBeenCalledWith(LOCALSTORAGE_KEY, { lastReport });
  });

  describe('_checkReportStatus', () => {
    // send the report if we get to check the time
    const lastReportShouldSendNow = Date.now() - REPORT_INTERVAL_MS - 1;

    test('returns false whenever telemetryOptedIn is null', () => {
      const injector = {
        localStorage: {
          get: jest.fn().mockReturnValueOnce({ lastReport: lastReportShouldSendNow }),
        },
        telemetryOptedIn: null, // not yet opted in
      };
      const telemetry = new Telemetry(mockInjectorFromObject(injector), mockFetchTelemetry);

      expect(telemetry._checkReportStatus()).toBe(false);
    });

    test('returns false whenever telemetryOptedIn is false', () => {
      const injector = {
        localStorage: {
          get: jest.fn().mockReturnValueOnce({ lastReport: lastReportShouldSendNow }),
        },
        telemetryOptedIn: false, // opted out explicitly
      };
      const telemetry = new Telemetry(mockInjectorFromObject(injector), mockFetchTelemetry);

      expect(telemetry._checkReportStatus()).toBe(false);
    });

    // FLAKY: https://github.com/elastic/kibana/issues/27922
    test.skip('returns false if last report is too recent', () => {
      const injector = {
        localStorage: {
          // we expect '>', not '>='
          get: jest.fn().mockReturnValueOnce({ lastReport: Date.now() - REPORT_INTERVAL_MS }),
        },
        telemetryOptedIn: true,
      };
      const telemetry = new Telemetry(mockInjectorFromObject(injector), mockFetchTelemetry);

      expect(telemetry._checkReportStatus()).toBe(false);
    });

    test('returns true if last report is not defined', () => {
      const injector = {
        localStorage: {
          get: jest.fn().mockReturnValueOnce({ }),
        },
        telemetryOptedIn: true,
      };
      const telemetry = new Telemetry(mockInjectorFromObject(injector), mockFetchTelemetry);

      expect(telemetry._checkReportStatus()).toBe(true);
    });

    test('returns true if last report is defined and old enough', () => {
      const injector = {
        localStorage: {
          get: jest.fn().mockReturnValueOnce({ lastReport: lastReportShouldSendNow }),
        },
        telemetryOptedIn: true,
      };
      const telemetry = new Telemetry(mockInjectorFromObject(injector), mockFetchTelemetry);

      expect(telemetry._checkReportStatus()).toBe(true);
    });

    test('returns true if last report is defined and old enough as a string', () => {
      const injector = {
        localStorage: {
          get: jest.fn().mockReturnValueOnce({ lastReport: lastReportShouldSendNow.toString() }),
        },
        telemetryOptedIn: true,
      };
      const telemetry = new Telemetry(mockInjectorFromObject(injector), mockFetchTelemetry);

      expect(telemetry._checkReportStatus()).toBe(true);
    });

    test('returns true if last report is defined and malformed', () => {
      const injector = {
        localStorage: {
          get: jest.fn().mockReturnValueOnce({ lastReport: { not: { a: 'number' } } }),
        },
        telemetryOptedIn: true,
      };
      const telemetry = new Telemetry(mockInjectorFromObject(injector), mockFetchTelemetry);

      expect(telemetry._checkReportStatus()).toBe(true);
    });

  });

  describe('_sendIfDue', () => {

    test('ignores and returns false if already sending', () => {
      const injector = {
        localStorage: {
          get: jest.fn().mockReturnValueOnce(undefined), // never sent
        },
        telemetryOptedIn: true,
      };
      const telemetry = new Telemetry(mockInjectorFromObject(injector), mockFetchTelemetry);
      telemetry._sending = true;

      return expect(telemetry._sendIfDue()).resolves.toBe(false);
    });

    test('ignores and returns false if _checkReportStatus says so', () => {
      const injector = {
        localStorage: {
          get: jest.fn().mockReturnValueOnce(undefined), // never sent, so it would try if opted in
        },
        telemetryOptedIn: false, // opted out
      };
      const telemetry = new Telemetry(mockInjectorFromObject(injector), mockFetchTelemetry);

      return expect(telemetry._sendIfDue()).resolves.toBe(false);
    });

    test('sends telemetry when requested', () => {
      const now = Date.now();
      const injector = {
        '$http': jest.fn().mockResolvedValue({ }), // ignored response
        localStorage: {
          get: jest.fn().mockReturnValueOnce({ lastReport: now - REPORT_INTERVAL_MS - 1 }),
          set: jest.fn(),
        },
        telemetryOptedIn: true,
        telemetryUrl,
      };
      const telemetry = new Telemetry(mockInjectorFromObject(injector), mockFetchTelemetry);

      expect.hasAssertions();

      return telemetry._sendIfDue()
        .then(result => {
          expect(result).toBe(true);
          expect(telemetry._sending).toBe(false);

          // should be updated
          const lastReport = telemetry._lastReport;

          // if the test runs fast enough it should be exactly equal, but probably a few ms greater
          expect(lastReport).toBeGreaterThanOrEqual(now);

          expect(injector.$http).toHaveBeenCalledTimes(2);
          // assert that it sent every cluster's telemetry
          clusters.forEach(cluster => {
            expect(injector.$http).toHaveBeenCalledWith({
              method: 'POST',
              url: telemetryUrl,
              data: cluster,
              kbnXsrfToken: false,
            });
          });

          expect(injector.localStorage.set).toHaveBeenCalledTimes(1);
          expect(injector.localStorage.set).toHaveBeenCalledWith(LOCALSTORAGE_KEY, { lastReport });
        });
    });

    test('sends telemetry when requested and catches exceptions', () => {
      const lastReport = Date.now() - REPORT_INTERVAL_MS - 1;
      const injector = {
        '$http': jest.fn().mockRejectedValue(new Error('TEST - expected')), // caught failure
        localStorage: {
          get: jest.fn().mockReturnValueOnce({ lastReport }),
          set: jest.fn(),
        },
        telemetryOptedIn: true,
        telemetryUrl,
      };
      const telemetry = new Telemetry(mockInjectorFromObject(injector), mockFetchTelemetry);

      expect.hasAssertions();

      return telemetry._sendIfDue()
        .then(result => {
          expect(result).toBe(true); // attempted to send
          expect(telemetry._sending).toBe(false);

          // should be unchanged
          expect(telemetry._lastReport).toBe(lastReport);
          expect(injector.localStorage.set).toHaveBeenCalledTimes(0);

          expect(injector.$http).toHaveBeenCalledTimes(2);
          // assert that it sent every cluster's telemetry
          clusters.forEach(cluster => {
            expect(injector.$http).toHaveBeenCalledWith({
              method: 'POST',
              url: telemetryUrl,
              data: cluster,
              kbnXsrfToken: false,
            });
          });
        });
    });

  });

  test('start', () => {
    const injector = {
      localStorage: {
        get: jest.fn().mockReturnValueOnce(undefined),
      },
      telemetryOptedIn: false, // opted out
    };
    const telemetry = new Telemetry(mockInjectorFromObject(injector), mockFetchTelemetry);

    clearInterval(telemetry.start());
  });

});
