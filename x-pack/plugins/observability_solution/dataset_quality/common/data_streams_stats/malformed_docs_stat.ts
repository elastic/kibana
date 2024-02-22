/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DegradedDocsStatType } from './types';

export class DegradedDocsStat {
  dataset: DegradedDocsStatType['dataset'];
  percentage: DegradedDocsStatType['percentage'];

  private constructor(degradedDocsStat: DegradedDocsStat) {
    this.dataset = degradedDocsStat.dataset;
    this.percentage = degradedDocsStat.percentage;
  }

  public static create(degradedDocsStat: DegradedDocsStatType) {
    return new DegradedDocsStat(degradedDocsStat);
  }
}
