/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type AutoValueMode = 'none' | 'min' | 'max' | 'all';

export interface ColorRange {
  color: string;
  start: number;
  end: number;
  // todo: do we need it?
  id?: string;
}

export interface ColorRangeValidation {
  errors: string[];
  isValid: boolean;
}

export interface DataBounds {
  min: number;
  max: number;
}
