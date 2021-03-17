/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mountWithIntl } from '@kbn/test/jest';
import React from 'react';
import { DataContext } from './table_basic';
import { createGridCell } from './cell_value';
import { FieldFormat } from 'src/plugins/data/public';
import { Datatable } from 'src/plugins/expressions/public';

describe('datatable cell renderer', () => {
  const table: Datatable = {
    type: 'datatable',
    columns: [
      {
        id: 'a',
        name: 'a',
        meta: {
          type: 'number',
        },
      },
    ],
    rows: [{ a: 123 }],
  };
  const CellRenderer = createGridCell(
    {
      a: { convert: (x) => `formatted ${x}` } as FieldFormat,
    },
    DataContext
  );

  it('renders formatted value', () => {
    const instance = mountWithIntl(
      <DataContext.Provider
        value={{
          table,
          alignments: {
            a: 'right',
          },
        }}
      >
        <CellRenderer
          rowIndex={0}
          columnId="a"
          setCellProps={() => {}}
          isExpandable={false}
          isDetails={false}
          isExpanded={false}
        />
      </DataContext.Provider>
    );
    expect(instance.text()).toEqual('formatted 123');
  });

  it('set class with text alignment', () => {
    const cell = mountWithIntl(
      <DataContext.Provider
        value={{
          table,
          alignments: {
            a: 'right',
          },
        }}
      >
        <CellRenderer
          rowIndex={0}
          columnId="a"
          setCellProps={() => {}}
          isExpandable={false}
          isDetails={false}
          isExpanded={false}
        />
      </DataContext.Provider>
    );
    expect(cell.find('.lnsTableCell').prop('className')).toContain('--right');
  });
});
