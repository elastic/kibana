/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSelectableOption } from '@elastic/eui';
import { serializeFilterOptions, deserializeFilterOptions } from './table';

describe('Query param serialization', () => {
  it('knows how to serialize a set of options', () => {
    expect(
      serializeFilterOptions([
        { key: 'deprecated', checked: 'on' },
        { key: 'managed', checked: 'off' },
        { key: 'test' },
      ] as EuiSelectableOption[])
    ).toStrictEqual({
      deprecated: 'on',
      managed: 'off',
      test: 'unset',
    });
  });

  it('knows how to deserialize a set of filter query params', () => {
    expect(
      deserializeFilterOptions({
        managed: 'on',
        deprecated: 'off',
      })
    ).toStrictEqual([
      { key: 'managed', checked: 'on', label: 'Managed', 'data-test-subj': 'managedFilter' },
      {
        key: 'deprecated',
        checked: 'off',
        label: 'Deprecated',
        'data-test-subj': 'deprecatedFilter',
      },
    ]);
  });
});
