/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { APMError } from '../../../typings/es_schemas/ui/apm_error';
import { NOT_AVAILABLE_LABEL } from '../../../common/i18n';
import { getErrorName } from './get_error_name';

describe('getErrorName', () => {
  it('returns log message', () => {
    expect(
      getErrorName({
        error: {
          log: { message: 'bar' },
          exception: [{ message: 'foo' }],
        },
      } as APMError)
    ).toEqual('bar');
  });
  it('returns exception message', () => {
    expect(
      getErrorName({
        error: {
          exception: [{ message: 'foo' }],
        },
      } as APMError)
    ).toEqual('foo');
  });
  it('returns default message', () => {
    expect(getErrorName({} as APMError)).toEqual(NOT_AVAILABLE_LABEL);
  });
});
