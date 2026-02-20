/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { accessKnownApmEventFields } from '@kbn/apm-data-access-plugin/server/utils';
import type { FlattenedApmEvent } from '@kbn/apm-data-access-plugin/server/utils/utility_types';
import { NOT_AVAILABLE_LABEL } from '../../../common/i18n';
import { getErrorName } from './get_error_name';

describe('getErrorName', () => {
  it('returns log message', () => {
    const event = accessKnownApmEventFields({ 'error.log.message': ['bar'] });
    const exception = { message: 'foo' };

    expect(getErrorName(event, exception)).toEqual('bar');
  });
  it('returns exception message', () => {
    const event = accessKnownApmEventFields({} as Partial<FlattenedApmEvent>);
    const exception = { message: 'foo' };

    expect(getErrorName(event, exception)).toEqual('foo');
  });
  it('returns default message', () => {
    const event = accessKnownApmEventFields({} as Partial<FlattenedApmEvent>);
    expect(getErrorName(event, {})).toEqual(NOT_AVAILABLE_LABEL);
  });
});
