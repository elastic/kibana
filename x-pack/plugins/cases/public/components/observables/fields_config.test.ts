/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ValidationFunc } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib/types';
import { domainValidator, emailValidator, genericValidator } from './fields_config';

describe('emailValidator', () => {
  it('should return an error if the value is not a string', () => {
    const result = emailValidator({
      value: undefined,
      path: 'email',
    } as Parameters<ValidationFunc>[0]);

    expect(result).toEqual({
      code: 'ERR_NOT_STRING',
      message: 'Value should be a string',
      path: 'email',
    });
  });

  it('should return an error if the value is not a valid email', () => {
    const result = emailValidator({
      value: 'invalid-email',
      path: 'email',
    } as Parameters<ValidationFunc>[0]);
    expect(result).toEqual({
      code: 'ERR_NOT_EMAIL',
      message: 'Value should be an email',
      path: 'email',
    });
  });

  it('should return undefined if the value is a valid email', () => {
    const result = emailValidator({
      value: 'test@example.com',
      path: 'email',
    } as Parameters<ValidationFunc>[0]);
    expect(result).toBeUndefined();
  });
});

describe('genericValidator', () => {
  it('should return an error if the value is not a string', () => {
    const result = genericValidator({
      value: 123,
      path: 'generic',
    } as Parameters<ValidationFunc>[0]);
    expect(result).toEqual({
      code: 'ERR_NOT_STRING',
      message: 'Value should be a string',
      path: 'generic',
    });
  });

  it('should return an error if the value is not valid', () => {
    const result = genericValidator({
      value: 'invalid value!',
      path: 'generic',
    } as Parameters<ValidationFunc>[0]);
    expect(result).toEqual({
      code: 'ERR_NOT_VALID',
      message: 'Value is invalid',
      path: 'generic',
    });
  });

  it('should return undefined if the value is valid', () => {
    const result = genericValidator({
      value: 'valid_value',
      path: 'generic',
    } as Parameters<ValidationFunc>[0]);
    expect(result).toBeUndefined();
  });
});

describe('domainValidator', () => {
  it('should return undefined for a valid domain', () => {
    const result = domainValidator({
      value: 'example.com',
      path: 'domain',
    } as Parameters<ValidationFunc>[0]);
    expect(result).toBeUndefined();
  });

  it('should return an error for an invalid domain', () => {
    const result = domainValidator({
      value: '-invalid.com',
      path: 'domain',
    } as Parameters<ValidationFunc>[0]);
    expect(result).toEqual({
      code: 'ERR_NOT_VALID',
      message: 'Value is invalid',
      path: 'domain',
    });
  });

  it('should return an error for hyphen-spaced strings', () => {
    const result = domainValidator({
      value: 'test-test',
      path: 'domain',
    } as Parameters<ValidationFunc>[0]);
    expect(result).toEqual({
      code: 'ERR_NOT_VALID',
      message: 'Value is invalid',
      path: 'domain',
    });
  });

  it('should return an error for a non-string value', () => {
    const result = domainValidator({
      value: 12345,
      path: 'domain',
    } as Parameters<ValidationFunc>[0]);
    expect(result).toEqual({
      code: 'ERR_NOT_STRING',
      message: 'Value should be a string',
      path: 'domain',
    });
  });
});
