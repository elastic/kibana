/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { IUiSettingsClient } from '../../../../../../src/core/public/ui_settings/types';
import type { CustomPaletteState } from '../../../../../../src/plugins/charts/common/palette';
import type { PaletteRegistry } from '../../../../../../src/plugins/charts/public/services/palettes/types';
import type { IAggType } from '../../../../../../src/plugins/data/common/search/aggs/agg_type';
import type { RenderMode } from '../../../../../../src/plugins/expressions/common/expression_renderers/types';
import type { Datatable } from '../../../../../../src/plugins/expressions/common/expression_types/specs/datatable';
import type { DatatableProps } from '../../../common/expressions/datatable/datatable';
import type { LensGridDirection } from '../../../common/expressions/datatable/datatable_column';
import type { FormatFactory } from '../../../common/types';
import type { ILensInterpreterRenderHandlers, LensEditEvent } from '../../types';
import { LENS_EDIT_RESIZE_ACTION, LENS_EDIT_SORT_ACTION, LENS_TOGGLE_ACTION } from './constants';

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

export type LensSortAction = LensEditEvent<typeof LENS_EDIT_SORT_ACTION>;
export type LensResizeAction = LensEditEvent<typeof LENS_EDIT_RESIZE_ACTION>;
export type LensToggleAction = LensEditEvent<typeof LENS_TOGGLE_ACTION>;

export type DatatableRenderProps = DatatableProps & {
  formatFactory: FormatFactory;
  dispatchEvent: ILensInterpreterRenderHandlers['event'];
  getType: (name: string) => IAggType;
  renderMode: RenderMode;
  paletteService: PaletteRegistry;
  uiSettings: IUiSettingsClient;

  /**
   * A boolean for each table row, which is true if the row active
   * ROW_CLICK_TRIGGER actions attached to it, otherwise false.
   */
  rowHasRowClickTriggerActions?: boolean[];
};

export interface DataContextType {
  table?: Datatable;
  rowHasRowClickTriggerActions?: boolean[];
  alignments?: Record<string, 'left' | 'right' | 'center'>;
  minMaxByColumnId?: Record<string, { min: number; max: number }>;
  getColorForValue?: (
    value: number | undefined,
    state: CustomPaletteState,
    minMax: { min: number; max: number }
  ) => string | undefined;
}
