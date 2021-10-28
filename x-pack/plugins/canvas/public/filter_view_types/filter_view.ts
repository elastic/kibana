/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface FilterViewSpec {
  name: string;
  view: (...args: unknown[]) => Record<string, unknown>;
}

export class FilterView implements FilterViewSpec {
  public name: FilterViewSpec['name'];
  public view: FilterViewSpec['view'];

  constructor(config: FilterViewSpec) {
    this.name = config.name;
    this.view = config.view;
  }
}
