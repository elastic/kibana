/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChangePasswordFormValues } from './change_password_flyout';
import { validateChangePasswordForm } from './change_password_flyout';

describe('ChangePasswordFlyout', () => {
  describe('#validateChangePasswordForm', () => {
    describe('for current user', () => {
      it('should show an error when it is current user with no current password', () => {
        expect(
          validateChangePasswordForm({ password: 'changeme', confirm_password: 'changeme' }, true)
        ).toMatchInlineSnapshot(`
                  Object {
                    "current_password": "Enter your current password.",
                  }
              `);
      });

      it('should show errors when there is no new password', () => {
        expect(
          validateChangePasswordForm(
            {
              password: undefined,
              confirm_password: 'changeme',
            } as unknown as ChangePasswordFormValues,
            true
          )
        ).toMatchInlineSnapshot(`
          Object {
            "current_password": "Enter your current password.",
            "password": "Enter a new password.",
          }
        `);
      });

      it('should show errors when the new password is not at least 6 characters', () => {
        expect(validateChangePasswordForm({ password: '12345', confirm_password: '12345' }, true))
          .toMatchInlineSnapshot(`
                  Object {
                    "current_password": "Enter your current password.",
                    "password": "Password must be at least 6 characters.",
                  }
              `);
      });

      it('should show errors when new password does not match confirmation password', () => {
        expect(
          validateChangePasswordForm(
            {
              password: 'changeme',
              confirm_password: 'notTheSame',
            },
            true
          )
        ).toMatchInlineSnapshot(`
                  Object {
                    "confirm_password": "Passwords do not match.",
                    "current_password": "Enter your current password.",
                  }
              `);
      });

      it('should show NO errors', () => {
        expect(
          validateChangePasswordForm(
            {
              current_password: 'oldpassword',
              password: 'changeme',
              confirm_password: 'changeme',
            },
            true
          )
        ).toMatchInlineSnapshot(`Object {}`);
      });
    });

    describe('for another user', () => {
      it('should show errors when there is no new password', () => {
        expect(
          validateChangePasswordForm(
            {
              password: undefined,
              confirm_password: 'changeme',
            } as unknown as ChangePasswordFormValues,
            false
          )
        ).toMatchInlineSnapshot(`
          Object {
            "password": "Enter a new password.",
          }
        `);
      });

      it('should show errors when the new password is not at least 6 characters', () => {
        expect(validateChangePasswordForm({ password: '1234', confirm_password: '1234' }, false))
          .toMatchInlineSnapshot(`
          Object {
            "password": "Password must be at least 6 characters.",
          }
        `);
      });

      it('should show errors when new password does not match confirmation password', () => {
        expect(
          validateChangePasswordForm(
            {
              password: 'changeme',
              confirm_password: 'notTheSame',
            },
            false
          )
        ).toMatchInlineSnapshot(`
          Object {
            "confirm_password": "Passwords do not match.",
          }
        `);
      });

      it('should show NO errors', () => {
        expect(
          validateChangePasswordForm(
            {
              password: 'changeme',
              confirm_password: 'changeme',
            },
            false
          )
        ).toMatchInlineSnapshot(`Object {}`);
      });
    });
  });
});
