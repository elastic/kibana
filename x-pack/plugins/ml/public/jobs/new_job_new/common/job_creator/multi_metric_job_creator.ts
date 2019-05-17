/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { JobCreator } from './job_creator';
import { Field, Aggregation, SplitField } from '../../../../../common/types/fields';
import { Detector } from './configs';

export class MultiMetricJobCreator extends JobCreator {
  private _splitField: SplitField = null;

  public setSplitField(field: SplitField) {
    this._splitField = field;

    if (this._splitField === null) {
      this.removeSplitField();
    } else {
      for (let i = 0; i < this._detectors.length; i++) {
        this._detectors[i].partition_field_name = this._splitField.id;
      }
    }
  }

  public removeSplitField() {
    this._detectors.forEach(d => {
      delete d.partition_field_name;
    });
  }

  public get splitField(): SplitField {
    return this._splitField;
  }

  public addDetector(agg: Aggregation, field: Field) {
    const dtr: Detector = {
      function: agg.id,
      field_name: field.id,
    };

    if (this._splitField !== null) {
      dtr.partition_field_name = this._splitField.id;
    }

    this._addDetector(dtr);
  }

  public editDetector(agg: Aggregation, field: Field, index: number) {
    const dtr: Detector = {
      function: agg.id,
      field_name: field.id,
    };

    if (this._splitField !== null) {
      dtr.partition_field_name = this._splitField.id;
    }

    this._editDetector(dtr, index);
  }

  public removeDetector(index: number) {
    this._removeDetector(index);
  }
}
