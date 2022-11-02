/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Subject } from 'rxjs';
import { licensingMock } from '@kbn/licensing-plugin/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { LicensedEmailService } from './licensed_email_service';
import type { ILicense } from '@kbn/licensing-plugin/server';
import type { EmailService, PlainTextEmail } from './types';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const emailServiceMock: EmailService = {
  sendPlainTextEmail: jest.fn(),
};

const validLicense = licensingMock.createLicenseMock();
const invalidLicense = licensingMock.createLicenseMock();
invalidLicense.type = 'basic';
invalidLicense.check = jest.fn(() => ({
  state: 'invalid',
  message: 'This is an invalid testing license',
})) as unknown as any;

const someEmail: PlainTextEmail = {
  to: ['user1@email.com'],
  subject: 'Some subject',
  message: 'Some message',
};

describe('LicensedEmailService', () => {
  const logger = loggerMock.create();

  beforeEach(() => loggerMock.clear(logger));
  it('observes license$ changes and logs info or warning messages accordingly', () => {
    const license$ = new Subject<ILicense>();
    new LicensedEmailService(emailServiceMock, license$, 'platinum', logger);
    license$.next(invalidLicense);

    expect(logger.debug).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith('This is an invalid testing license');

    license$.next(validLicense);
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.debug).toHaveBeenCalledTimes(1);
    expect(logger.debug).toHaveBeenCalledWith(
      'Your current license allows sending email notifications'
    );
  });

  describe('sendPlainTextEmail()', () => {
    it('does not call the underlying email service until the license is determined and valid', async () => {
      const license$ = new Subject<ILicense>();
      const email = new LicensedEmailService(emailServiceMock, license$, 'platinum', logger);

      email.sendPlainTextEmail(someEmail);
      expect(emailServiceMock.sendPlainTextEmail).not.toHaveBeenCalled();
      license$.next(validLicense);

      await delay(1);

      expect(emailServiceMock.sendPlainTextEmail).toHaveBeenCalledTimes(1);
      expect(emailServiceMock.sendPlainTextEmail).toHaveBeenCalledWith(someEmail);
    });

    it('does not call the underlying email service if the license is invalid', async () => {
      const license$ = new Subject<ILicense>();
      const email = new LicensedEmailService(emailServiceMock, license$, 'platinum', logger);
      license$.next(invalidLicense);

      try {
        await email.sendPlainTextEmail(someEmail);
      } catch (err) {
        expect(err.message).toEqual(
          'The current license does not allow sending email notifications'
        );
        return;
      }

      expect('it should have thrown').toEqual('but it did not');
    });

    it('does not log a warning for every email attempt, but rather for every license change', async () => {
      const license$ = new Subject<ILicense>();
      const email = new LicensedEmailService(emailServiceMock, license$, 'platinum', logger);
      license$.next(invalidLicense);
      license$.next(validLicense);
      license$.next(invalidLicense);

      expect(logger.debug).toHaveBeenCalledTimes(1);
      expect(logger.warn).toHaveBeenCalledTimes(2);

      let emailsOk = 0;
      let emailsKo = 0;
      const silentSend = async () => {
        try {
          await email.sendPlainTextEmail(someEmail);
          emailsOk++;
        } catch (err) {
          emailsKo++;
        }
      };

      await silentSend();
      await silentSend();
      await silentSend();
      await silentSend();
      license$.next(validLicense);
      await silentSend();
      await silentSend();
      await silentSend();
      await silentSend();

      expect(logger.debug).toHaveBeenCalledTimes(2);
      expect(logger.warn).toHaveBeenCalledTimes(2);
      expect(emailsKo).toEqual(4);
      expect(emailsOk).toEqual(4);
    });
  });
});
