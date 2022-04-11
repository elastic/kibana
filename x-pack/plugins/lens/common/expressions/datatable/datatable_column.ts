/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Direction } from '@elastic/eui';
import type { PaletteOutput, CustomPaletteParams } from '@kbn/coloring';
import { SortingHint } from '../..';
import type { CustomPaletteState } from '../../../../../../src/plugins/charts/common';
import type {
  ExpressionFunctionDefinition,
  DatatableColumn,
} from '../../../../../../src/plugins/expressions/common';

export type LensGridDirection = 'none' | Direction;

export interface ColumnConfig {
  columns: ColumnConfigArg[];
  sortingColumnId: string | undefined;
  sortingDirection: LensGridDirection;
}

export type ColumnConfigArg = Omit<ColumnState, 'palette'> & {
  type: 'lens_datatable_column';
  palette?: PaletteOutput<CustomPaletteState>;
  summaryRowValue?: unknown;
  sortingHint?: SortingHint;
};

export interface ColumnState {
  columnId: string;
  width?: number;
  hidden?: boolean;
  isTransposed?: boolean;
  // These flags are necessary to transpose columns and map them back later
  // They are set automatically and are not user-editable
  transposable?: boolean;
  originalColumnId?: string;
  originalName?: string;
  bucketValues?: Array<{ originalBucketColumn: DatatableColumn; value: unknown }>;
  alignment?: 'left' | 'right' | 'center';
  palette?: PaletteOutput<CustomPaletteParams>;
  colorMode?: 'none' | 'cell' | 'text';
  summaryRow?: 'none' | 'sum' | 'avg' | 'count' | 'min' | 'max';
  summaryLabel?: string;
}

export type DatatableColumnResult = ColumnState & { type: 'lens_datatable_column' };

export const datatableColumn: ExpressionFunctionDefinition<
  'lens_datatable_column',
  null,
  ColumnState & { sortingHint?: SortingHint },
  DatatableColumnResult
> = {
  name: 'lens_datatable_column',
  aliases: [],
  type: 'lens_datatable_column',
  help: '',
  inputTypes: ['null'],
  args: {
    columnId: { types: ['string'], help: '' },
    alignment: { types: ['string'], help: '' },
    sortingHint: { types: ['string'], help: '' },
    hidden: { types: ['boolean'], help: '' },
    width: { types: ['number'], help: '' },
    isTransposed: { types: ['boolean'], help: '' },
    transposable: { types: ['boolean'], help: '' },
    colorMode: { types: ['string'], help: '' },
    palette: {
      types: ['palette'],
      help: '',
    },
    summaryRow: { types: ['string'], help: '' },
    summaryLabel: { types: ['string'], help: '' },
  },
  fn: function fn(input: unknown, args: ColumnState) {
    return {
      type: 'lens_datatable_column',
      ...args,
    };
  },
};
