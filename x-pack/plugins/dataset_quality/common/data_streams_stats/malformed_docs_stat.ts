/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MalformedDocsStatType } from './types';

export class MalformedDocsStat {
  dataset: MalformedDocsStatType['dataset'];
  percentage: MalformedDocsStatType['percentage'];

  private constructor(malformedDocsStat: MalformedDocsStat) {
    this.dataset = malformedDocsStat.dataset;
    this.percentage = malformedDocsStat.percentage;
  }

  public static create(malformedDocsStat: MalformedDocsStatType) {
    return new MalformedDocsStat(malformedDocsStat);
  }
}
