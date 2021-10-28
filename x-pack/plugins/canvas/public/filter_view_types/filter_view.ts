/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Filter } from '../../types';

export type ComplexFilterViewField = (value: unknown) => Record<string, SimpleFilterViewField>;

export interface SimpleFilterViewField {
  label: string;
  formatter?: (value: unknown) => string;
}

export interface FormattedFilterViewField {
  label: string;
  formattedValue: string;
}

export type FilterViewInstance = Record<
  keyof Filter,
  SimpleFilterViewField | ComplexFilterViewField
>;

export type FlattenFilterViewInstance = Record<string, SimpleFilterViewField>;
export type FormattedFilterViewInstance = Record<string, FormattedFilterViewField>;

export interface FilterViewSpec {
  name: string;
  view: (...args: unknown[]) => FilterViewInstance;
}

export class FilterView implements FilterViewSpec {
  public name: FilterViewSpec['name'];
  public view: FilterViewSpec['view'];

  constructor(config: FilterViewSpec) {
    this.name = config.name;
    this.view = config.view;
  }
}
