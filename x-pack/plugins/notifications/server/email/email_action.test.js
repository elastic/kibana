/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ActionResult } from '../';
import { EMAIL_ACTION_ID, EmailAction } from './email_action';

describe('EmailAction', () => {

  const server = { };
  const options = { options: true };
  const defaults = { defaults: true };
  const transporter = {
    // see beforeEach
  };
  const _nodemailer = {
    // see beforeEach
  };

  let action;

  beforeEach(() => {
    transporter.verify = jest.fn();
    transporter.sendMail = jest.fn();
    _nodemailer.createTransport = jest.fn().mockReturnValue(transporter);

    action = new EmailAction({ server, options, defaults, _nodemailer });
  });

  test('id and name to be from constructor', () => {
    expect(action.getId()).toBe(EMAIL_ACTION_ID);
    expect(action.getName()).toBe('Email');
    expect(action.transporter).toBe(transporter);

    expect(_nodemailer.createTransport).toHaveBeenCalledTimes(1);
    expect(_nodemailer.createTransport).toHaveBeenCalledWith(options, defaults);
  });

  describe('getMissingFields', () => {

    test('returns missing fields', () => {
      const to = { field: 'to', name: 'To', type: 'email' };
      const from = { field: 'from', name: 'From', type: 'email' };
      const subject = { field: 'subject', name: 'Subject', type: 'text' };
      const markdown = { field: 'markdown', name: 'Body', type: 'markdown' };

      const missing = [
        { defaults: { }, notification: { }, missing: [ to, from, subject, markdown, ], },
        { defaults: { }, notification: { from: 'b@c.co', subject: 'subject', markdown: 'body', }, missing: [ to, ], },
        { defaults: { from: 'b@c.co', }, notification: { subject: 'subject', markdown: 'body', }, missing: [ to, ], },
        { defaults: { }, notification: { to: 'a@b.co', subject: 'subject', markdown: 'body', }, missing: [ from, ], },
        { defaults: { to: 'a@b.co', }, notification: { subject: 'subject', markdown: 'body', }, missing: [ from, ], },
        { defaults: { }, notification: { to: 'a@b.co', from: 'b@c.co', markdown: 'body', }, missing: [ subject, ], },
        { defaults: { }, notification: { to: 'a@b.co', from: 'b@c.co', subject: 'subject', }, missing: [ markdown, ], },
      ];

      missing.forEach(check => {
        const newDefaultsAction = new EmailAction({ server, defaults: check.defaults, _nodemailer });

        expect(newDefaultsAction.getMissingFields(check.notification)).toEqual(check.missing);
      });
    });

    test('returns [] when all fields exist', () => {
      const exists = [
        { defaults: { }, notification: { to: 'a@b.co', from: 'b@c.co', subject: 'subject', markdown: 'body', }, },
        { defaults: { to: 'a@b.co', }, notification: { from: 'b@c.co', subject: 'subject', markdown: 'body', }, },
        { defaults: { from: 'b@c.co', }, notification: { to: 'a@b.co', subject: 'subject', markdown: 'body', }, },
        { defaults: { to: 'a@b.co', from: 'b@c.co', }, notification: { subject: 'subject', markdown: 'body', }, },
      ];

      exists.forEach(check => {
        const newDefaultsAction = new EmailAction({ server, defaults: check.defaults, _nodemailer });

        expect(newDefaultsAction.getMissingFields(check.notification)).toEqual([]);
      });
    });

  });

  describe('doPerformHealthCheck', () => {

    test('rethrows Error for failure', async () => {
      const error = new Error('TEST - expected');

      transporter.verify.mockRejectedValue(error);

      await expect(action.doPerformHealthCheck())
        .rejects
        .toThrow(error);

      expect(transporter.verify).toHaveBeenCalledTimes(1);
      expect(transporter.verify).toHaveBeenCalledWith();
    });

    test('returns ActionResult for success', async () => {
      transporter.verify.mockResolvedValue(true);

      const result = await action.doPerformHealthCheck();

      expect(result instanceof ActionResult).toBe(true);
      expect(result.isOk()).toBe(true);
      expect(result.getMessage()).toMatch('Email action SMTP configuration has been verified.');
      expect(result.getResponse()).toEqual({
        verified: true
      });

      expect(transporter.verify).toHaveBeenCalledTimes(1);
      expect(transporter.verify).toHaveBeenCalledWith();
    });

  });

  describe('doPerformAction', () => {
    const email = { subject: 'email', markdown: 'body' };

    test('rethrows Error for failure', async () => {
      const error = new Error('TEST - expected');

      transporter.sendMail.mockRejectedValue(error);

      await expect(action.doPerformAction(email))
        .rejects
        .toThrow(error);

      expect(transporter.sendMail).toHaveBeenCalledTimes(1);
      expect(transporter.sendMail).toHaveBeenCalledWith({
        to: undefined,
        from: undefined,
        cc: undefined,
        bcc: undefined,
        subject: email.subject,
        html: email.markdown,
        text: email.markdown,
      });
    });

    test('returns ActionResult for success', async () => {
      const response = { fake: true };

      transporter.sendMail.mockResolvedValue(response);

      const result = await action.doPerformAction(email);

      expect(result instanceof ActionResult).toBe(true);
      expect(result.isOk()).toBe(true);
      expect(result.getMessage()).toMatch(`Sent email for '${email.subject}'.`);
      expect(result.getResponse()).toBe(response);

      expect(transporter.sendMail).toHaveBeenCalledTimes(1);
      expect(transporter.sendMail).toHaveBeenCalledWith({
        to: undefined,
        from: undefined,
        cc: undefined,
        bcc: undefined,
        subject: email.subject,
        html: email.markdown,
        text: email.markdown,
      });
    });

  });

});
