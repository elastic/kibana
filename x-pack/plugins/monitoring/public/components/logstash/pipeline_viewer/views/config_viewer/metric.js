/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



export class Metric {
  constructor(name, format, suffix, reducer, operation, isHighlighted) {
    this.name = name;
    this.format = format;
    this.suffix = suffix;
    this.reducer = reducer;
    this.operation = operation;
    this.isHighlighted = isHighlighted;
  }
}
