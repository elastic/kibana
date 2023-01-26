/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IUiSettingsClient } from '@kbn/core/public';
import type { PaletteRegistry } from '@kbn/coloring';
import { CustomPaletteState } from '@kbn/charts-plugin/public';
import type { IAggType } from '@kbn/data-plugin/public';
import type { Datatable, RenderMode } from '@kbn/expressions-plugin/common';
import type {
  ILensInterpreterRenderHandlers,
  LensCellValueAction,
  LensEditEvent,
} from '../../../types';
import {
  LENS_EDIT_SORT_ACTION,
  LENS_EDIT_RESIZE_ACTION,
  LENS_TOGGLE_ACTION,
  LENS_EDIT_PAGESIZE_ACTION,
} from './constants';
import type { FormatFactory } from '../../../../common';
import type { DatatableProps, LensGridDirection } from '../../../../common/expressions';

export interface LensSortActionData {
  columnId: string | undefined;
  direction: LensGridDirection;
}

export interface LensResizeActionData {
  columnId: string;
  width: number | undefined;
}

export interface LensToggleActionData {
  columnId: string;
}

export interface LensPagesizeActionData {
  size: number;
}

export type LensSortAction = LensEditEvent<typeof LENS_EDIT_SORT_ACTION>;
export type LensResizeAction = LensEditEvent<typeof LENS_EDIT_RESIZE_ACTION>;
export type LensToggleAction = LensEditEvent<typeof LENS_TOGGLE_ACTION>;
export type LensPagesizeAction = LensEditEvent<typeof LENS_EDIT_PAGESIZE_ACTION>;

export type DatatableRenderProps = DatatableProps & {
  formatFactory: FormatFactory;
  dispatchEvent: ILensInterpreterRenderHandlers['event'];
  getType: (name: string) => IAggType;
  renderMode: RenderMode;
  paletteService: PaletteRegistry;
  uiSettings: IUiSettingsClient;
  interactive: boolean;
  renderComplete: () => void;

  /**
   * A boolean for each table row, which is true if the row active
   * ROW_CLICK_TRIGGER actions attached to it, otherwise false.
   */
  rowHasRowClickTriggerActions?: boolean[];
  /**
   * Array of LensCellValueAction to be rendered on each column by id
   * uses CELL_VALUE_TRIGGER actions attached.
   */
  columnCellValueActions?: LensCellValueAction[][];
  columnFilterable?: boolean[];
};

export interface DataContextType {
  table?: Datatable;
  rowHasRowClickTriggerActions?: boolean[];
  alignments?: Record<string, 'left' | 'right' | 'center'>;
  minMaxByColumnId?: Record<string, { min: number; max: number }>;
  handleFilterClick?: (
    field: string,
    value: unknown,
    colIndex: number,
    rowIndex: number,
    negate?: boolean
  ) => void;
  getColorForValue?: (
    value: number | undefined,
    state: CustomPaletteState,
    minMax: { min: number; max: number }
  ) => string | undefined;
}
