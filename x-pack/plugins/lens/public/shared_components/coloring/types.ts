/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
export interface ColorStop {
  color: string;
  stop: number;
}

export interface CustomPaletteParams {
  name?: string;
  reverse?: boolean;
  rangeType?: 'number' | 'percent';
  continuity?: 'above' | 'below' | 'all' | 'none';
  progression?: 'fixed';
  rangeMin?: number;
  rangeMax?: number;
  stops?: ColorStop[];
  colorStops?: ColorStop[];
  steps?: number;
}

export type RequiredPaletteParamTypes = Required<CustomPaletteParams>;
