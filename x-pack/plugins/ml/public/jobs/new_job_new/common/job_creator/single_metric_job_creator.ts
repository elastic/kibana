/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { JobCreator } from './job_creator';
import { Field, Aggregation } from '../../../../../common/types/fields';
import { Detector } from './configs';

export class SingleMetricJobCreator extends JobCreator {
  public setDetector(agg: Aggregation, field: Field) {
    const dtr: Detector = {
      function: agg.id,
      field_name: field.id,
    };
    if (this._detectors.length === 0) {
      this._addDetector(dtr);
    } else {
      this._editDetector(dtr, 0);
    }
  }
}
