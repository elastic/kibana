/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export class Collection<T> {
  private _values: T[] = [];
  private _indexes: Record<string, number> = {};

  set(value: T, id?: string | number) {
    if (id === undefined) {
      id = String(value);
    }
    const indexOf = this._indexes[id];

    if (indexOf === undefined) {
      const index = this._values.length;
      this._values[index] = value;
      this._indexes[id] = index;
      return index;
    }
    return indexOf;
  }

  values() {
    return this._values;
  }
}
