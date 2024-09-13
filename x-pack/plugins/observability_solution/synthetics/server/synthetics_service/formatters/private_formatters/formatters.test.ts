/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { formatKibanaNamespace } from '../../../../common/formatters/format_space_name';

describe('formatKibanaNamespace', () => {
  it('replaces all invalid characters with an underscore', () => {
    const kibanaSpaceId = '1a-_';
    expect(formatKibanaNamespace(kibanaSpaceId)).toEqual('1a__');
  });
});
