/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AxiosError } from 'axios';

import { Logger } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import {
  prepareIncident,
  createServiceError,
  getPushedDate,
  throwIfSubActionIsNotSupported,
} from './utils';

const logger = loggingSystemMock.create().get() as jest.Mocked<Logger>;

/**
 * The purpose of this test is to
 * prevent developers from accidentally
 * change important configuration values
 * such as the scope or the import set table
 * of our ServiceNow application
 */
describe('utils', () => {
  describe('prepareIncident', () => {
    test('it prepares the incident correctly when useOldApi=false', async () => {
      const incident = { short_description: 'title', description: 'desc' };
      const newIncident = prepareIncident(false, incident);
      expect(newIncident).toEqual({ u_short_description: 'title', u_description: 'desc' });
    });

    test('it prepares the incident correctly when useOldApi=true', async () => {
      const incident = { short_description: 'title', description: 'desc' };
      const newIncident = prepareIncident(true, incident);
      expect(newIncident).toEqual(incident);
    });
  });

  describe('createServiceError', () => {
    test('it creates an error when the response is null', async () => {
      const error = new Error('An error occurred');
      // @ts-expect-error
      expect(createServiceError(error, 'Unable to do action').message).toBe(
        '[Action][ServiceNow]: Unable to do action. Error: An error occurred Reason: unknown: errorResponse was null'
      );
    });

    test('it creates an error with response correctly', async () => {
      const axiosError = {
        message: 'An error occurred',
        response: { data: { error: { message: 'Denied', detail: 'no access' } } },
      } as AxiosError;

      expect(createServiceError(axiosError, 'Unable to do action').message).toBe(
        '[Action][ServiceNow]: Unable to do action. Error: An error occurred Reason: Denied: no access'
      );
    });

    test('it creates an error correctly when the ServiceNow error is null', async () => {
      const axiosError = {
        message: 'An error occurred',
        response: { data: { error: null } },
      } as AxiosError;

      expect(createServiceError(axiosError, 'Unable to do action').message).toBe(
        '[Action][ServiceNow]: Unable to do action. Error: An error occurred Reason: unknown: no error in error response'
      );
    });
  });

  describe('getPushedDate', () => {
    beforeAll(() => {
      jest.useFakeTimers('modern');
      jest.setSystemTime(new Date('2021-10-04 11:15:06 GMT'));
    });

    afterAll(() => {
      jest.useRealTimers();
    });

    test('it formats the date correctly if timestamp is provided', async () => {
      expect(getPushedDate('2021-10-04 11:15:06')).toBe('2021-10-04T11:15:06.000Z');
    });

    test('it formats the date correctly if timestamp is not provided', async () => {
      expect(getPushedDate()).toBe('2021-10-04T11:15:06.000Z');
    });
  });

  describe('throwIfSubActionIsNotSupported', () => {
    const api = { pushToService: 'whatever' };

    test('it throws correctly if the subAction is not supported', async () => {
      expect.assertions(1);

      expect(() =>
        throwIfSubActionIsNotSupported({
          api,
          subAction: 'addEvent',
          supportedSubActions: ['getChoices'],
          logger,
        })
      ).toThrow('[Action][ExternalService] Unsupported subAction type addEvent');
    });

    test('it throws correctly if the subAction is not implemented', async () => {
      expect.assertions(1);

      expect(() =>
        throwIfSubActionIsNotSupported({
          api,
          subAction: 'pushToService',
          supportedSubActions: ['getChoices'],
          logger,
        })
      ).toThrow('[Action][ExternalService] subAction pushToService not implemented.');
    });

    test('it does not throw if the sub action is supported and implemented', async () => {
      expect(() =>
        throwIfSubActionIsNotSupported({
          api,
          subAction: 'pushToService',
          supportedSubActions: ['pushToService'],
          logger,
        })
      ).not.toThrow();
    });
  });
});
