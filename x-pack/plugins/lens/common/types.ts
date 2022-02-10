/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Filter, FilterMeta } from '@kbn/es-query';
import type {
  IFieldFormat,
  SerializedFieldFormat,
} from '../../../../src/plugins/field_formats/common';
import type { Datatable } from '../../../../src/plugins/expressions/common';
import type { PaletteContinuity } from '../../../../src/plugins/charts/common';

export type FormatFactory = (mapping?: SerializedFieldFormat) => IFieldFormat;

export interface ExistingFields {
  indexPatternTitle: string;
  existingFieldNames: string[];
}

export interface DateRange {
  fromDate: string;
  toDate: string;
}

export interface PersistableFilterMeta extends FilterMeta {
  indexRefName?: string;
}

export interface PersistableFilter extends Filter {
  meta: PersistableFilterMeta;
}

export interface LensMultiTable {
  type: 'lens_multitable';
  tables: Record<string, Datatable>;
  dateRange?: {
    fromDate: Date;
    toDate: Date;
  };
}

export interface ColorStop {
  color: string;
  stop: number;
}

export interface CustomPaletteParams {
  name?: string;
  reverse?: boolean;
  rangeType?: 'number' | 'percent';
  continuity?: PaletteContinuity;
  progression?: 'fixed';
  rangeMin?: number;
  rangeMax?: number;
  stops?: ColorStop[];
  colorStops?: ColorStop[];
  steps?: number;
}
export type CustomPaletteParamsConfig = CustomPaletteParams & {
  maxSteps?: number;
};

export type RequiredPaletteParamTypes = Required<CustomPaletteParams> & {
  maxSteps?: number;
};

export type LayerType = 'data' | 'referenceLine';

// Shared by XY Chart and Heatmap as for now
export type ValueLabelConfig = 'hide' | 'inside' | 'outside';
