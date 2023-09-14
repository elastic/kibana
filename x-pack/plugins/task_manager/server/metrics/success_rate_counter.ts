/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { JsonObject } from '@kbn/utility-types';

export interface SuccessRate extends JsonObject {
  success: number;
  total: number;
}

export class SuccessRateCounter {
  private success = 0;
  private total = 0;

  public initialMetric(): SuccessRate {
    return {
      success: 0,
      total: 0,
    };
  }

  public get(): SuccessRate {
    return {
      success: this.success,
      total: this.total,
    };
  }

  public increment(success: boolean) {
    if (success) {
      this.success++;
    }
    this.total++;
  }

  public reset() {
    this.success = 0;
    this.total = 0;
  }
}
