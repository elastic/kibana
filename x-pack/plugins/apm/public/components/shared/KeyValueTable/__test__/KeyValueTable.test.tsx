/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { KeyValueTable } from '..';
import { render } from '@testing-library/react';
import { renderWithTheme } from '../../../../utils/testHelpers';

function getKeys(output: ReturnType<typeof render>) {
  const keys = output.getAllByTestId('dot-key');
  return Array.isArray(keys) ? keys.map((node) => node.textContent) : [];
}

function getValues(output: ReturnType<typeof render>) {
  const values = output.getAllByTestId('value');
  return Array.isArray(values) ? values.map((node) => node.textContent) : [];
}

describe('KeyValueTable', () => {
  it('displays key and value table', () => {
    const data = [
      { key: 'name.first', value: 'First Name' },
      { key: 'name.last', value: 'Last Name' },
      { key: 'age', value: '29' },
      { key: 'active', value: true },
      { key: 'useless', value: false },
      { key: 'start', value: null },
      { key: 'end', value: undefined },
      { key: 'nested.b.c', value: 'ccc' },
      { key: 'nested.a', value: 'aaa' },
    ];
    const output = renderWithTheme(<KeyValueTable keyValuePairs={data} />);
    const rows = output.container.querySelectorAll('tr');
    expect(rows.length).toEqual(9);

    expect(getKeys(output)).toEqual([
      'name.first',
      'name.last',
      'age',
      'active',
      'useless',
      'start',
      'end',
      'nested.b.c',
      'nested.a',
    ]);

    expect(getValues(output)).toEqual([
      'First Name',
      'Last Name',
      '29',
      'true',
      'false',
      'N/A',
      'N/A',
      'ccc',
      'aaa',
    ]);
  });
});
