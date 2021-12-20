/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** @deprecated **/
export type AutoValueMode = 'none' | 'min' | 'max' | 'all';

export interface ColorRange {
  color: string;
  start: number;
  end: number;
  // todo: do we need it?
  id?: string;
}

/** @internal **/
export interface ColorRangeValidation {
  errors: string[];
  isValid: boolean;
}

/** @internal **/
export interface DataBounds {
  min: number;
  max: number;
}

/** @internal **/
export type ColorRangesUpdateFn = (payload: {
  colorRanges: ColorRange[];
  autoValue?: AutoValueMode;
}) => void;

/** @internal **/
export type ColorRangeAccessor = 'start' | 'end';
