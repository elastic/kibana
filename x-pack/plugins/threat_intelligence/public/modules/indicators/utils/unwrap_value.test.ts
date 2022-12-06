/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RawIndicatorFieldId } from '../../../../common/types/indicator';
import { unwrapValue } from './unwrap_value';

describe('unwrapValue()', () => {
  it('should return the first field value or null, if not present', () => {
    expect(unwrapValue({ fields: {} }, RawIndicatorFieldId.Type)).toEqual(null);
    expect(unwrapValue({} as any, RawIndicatorFieldId.Type)).toEqual(null);
    expect(unwrapValue(null as any, RawIndicatorFieldId.Type)).toEqual(null);

    expect(
      unwrapValue({ fields: { [RawIndicatorFieldId.Type]: ['ip'] } }, RawIndicatorFieldId.Type)
    ).toEqual('ip');
  });
});
