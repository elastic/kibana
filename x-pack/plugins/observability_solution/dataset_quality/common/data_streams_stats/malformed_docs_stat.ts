/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QualityIndicators } from '../types';
import { mapPercentageToQuality } from '../utils';
import { DegradedDocsStatType } from './types';

export class DegradedDocsStat {
  dataset: DegradedDocsStatType['dataset'];
  percentage: DegradedDocsStatType['percentage'];
  count: DegradedDocsStatType['count'];
  docsCount: DegradedDocsStatType['docsCount'];
  quality: QualityIndicators;

  private constructor(degradedDocsStat: DegradedDocsStat) {
    this.dataset = degradedDocsStat.dataset;
    this.percentage = degradedDocsStat.percentage;
    this.count = degradedDocsStat.count;
    this.docsCount = degradedDocsStat.docsCount;
    this.quality = degradedDocsStat.quality;
  }

  public static create(degradedDocsStat: DegradedDocsStatType) {
    const quality = mapPercentageToQuality(degradedDocsStat.percentage);
    return new DegradedDocsStat({ ...degradedDocsStat, quality });
  }
}
