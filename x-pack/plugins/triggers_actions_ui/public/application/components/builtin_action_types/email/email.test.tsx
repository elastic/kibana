/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TypeRegistry } from '../../../type_registry';
import { registerBuiltInActionTypes } from '..';
import { ActionTypeModel } from '../../../../types';
import { getEmailServices } from './email';
import {
  ValidatedEmail,
  InvalidEmailReason,
  ValidateEmailAddressesOptions,
  MustacheInEmailRegExp,
} from '@kbn/actions-plugin/common';

const ACTION_TYPE_ID = '.email';
let actionTypeModel: ActionTypeModel;

const RegistrationServices = {
  validateEmailAddresses: validateEmails,
};

// stub for the real validator
function validateEmails(
  addresses: string[],
  options?: ValidateEmailAddressesOptions
): ValidatedEmail[] {
  return addresses.map((address) => {
    if (address.includes('invalid'))
      return { address, valid: false, reason: InvalidEmailReason.invalid };
    else if (address.includes('notallowed'))
      return { address, valid: false, reason: InvalidEmailReason.notAllowed };
    else if (options?.treatMustacheTemplatesAsValid) return { address, valid: true };
    else if (address.match(MustacheInEmailRegExp))
      return { address, valid: false, reason: InvalidEmailReason.invalid };
    else return { address, valid: true };
  });
}

beforeEach(() => {
  jest.resetAllMocks();
});

beforeAll(() => {
  const actionTypeRegistry = new TypeRegistry<ActionTypeModel>();
  registerBuiltInActionTypes({ actionTypeRegistry, services: RegistrationServices });
  const getResult = actionTypeRegistry.get(ACTION_TYPE_ID);
  if (getResult !== null) {
    actionTypeModel = getResult;
  }
});

describe('actionTypeRegistry.get() works', () => {
  test('action type static data is as expected', () => {
    expect(actionTypeModel.id).toEqual(ACTION_TYPE_ID);
    expect(actionTypeModel.iconClass).toEqual('email');
  });
});

describe('getEmailServices', () => {
  test('should return elastic cloud service if isCloudEnabled is true', () => {
    const services = getEmailServices(true);
    expect(services.find((service) => service.value === 'elastic_cloud')).toBeTruthy();
  });

  test('should not return elastic cloud service if isCloudEnabled is false', () => {
    const services = getEmailServices(false);
    expect(services.find((service) => service.value === 'elastic_cloud')).toBeFalsy();
  });
});

describe('action params validation', () => {
  test('action params validation succeeds when action params is valid', async () => {
    const actionParams = {
      to: [],
      cc: ['test1@test.com'],
      bcc: ['mustache {{\n}} template'],
      message: 'message {test}',
      subject: 'test',
    };

    expect(await actionTypeModel.validateParams(actionParams)).toEqual({
      errors: {
        to: [],
        cc: [],
        bcc: [],
        message: [],
        subject: [],
      },
    });
  });

  test('action params validation fails when action params is not valid', async () => {
    const actionParams = {
      to: ['invalid.com'],
      cc: ['bob@notallowed.com'],
      bcc: ['another-invalid.com'],
      subject: 'test',
    };

    expect(await actionTypeModel.validateParams(actionParams)).toEqual({
      errors: {
        to: ['Email address invalid.com is not valid.'],
        cc: ['Email address bob@notallowed.com is not allowed.'],
        bcc: ['Email address another-invalid.com is not valid.'],
        message: ['Message is required.'],
        subject: [],
      },
    });
  });
});
