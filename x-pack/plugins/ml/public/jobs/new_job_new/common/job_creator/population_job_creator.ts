/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { JobCreator } from './job_creator';
import { Field, Aggregation, SplitField } from '../../../../../common/types/fields';
import { Detector } from './configs';

export class PopulationJobCreator extends JobCreator {
  private _populationField: SplitField = null;
  private _splitFields: SplitField[] = [];

  public setSplitField(field: SplitField, index: number) {
    if (field === null) {
      this.removeSplitField(index);
    } else {
      if (this._detectors[index] !== undefined) {
        this._splitFields[index] = field;
        this._detectors[index].by_field_name = field.id;
      }
    }
  }

  public removeSplitField(index: number) {
    if (this._detectors[index] !== undefined) {
      this._splitFields[index] = null;
      delete this._detectors[index].by_field_name;
    }
  }

  public getSplitField(index: number): SplitField {
    if (this._splitFields[index] === undefined) {
      return null;
    }
    return this._splitFields[index];
  }

  public setPopulationField(field: SplitField) {
    this._populationField = field;

    if (this._populationField === null) {
      this.removePopulationField();
    } else {
      for (let i = 0; i < this._detectors.length; i++) {
        this._detectors[i].over_field_name = this._populationField.id;
      }
    }
  }

  public removePopulationField() {
    this._detectors.forEach(d => {
      delete d.over_field_name;
    });
  }

  public get populationField(): SplitField {
    return this._populationField;
  }

  public addDetector(agg: Aggregation, field: Field) {
    const dtr: Detector = {
      function: agg.id,
      field_name: field.id,
    };

    if (this._populationField !== null) {
      dtr.over_field_name = this._populationField.id;
    }

    this._addDetector(dtr);
    this._splitFields.push(null);
  }

  public editDetector(agg: Aggregation, field: Field, index: number) {
    const dtr: Detector = {
      function: agg.id,
      field_name: field.id,
    };

    if (this._populationField !== null) {
      dtr.over_field_name = this._populationField.id;
    }

    const sp = this._splitFields[index];
    if (sp !== undefined && sp !== null) {
      dtr.by_field_name = sp.id;
    }

    this._editDetector(dtr, index);
  }

  public removeDetector(index: number) {
    this._removeDetector(index);
    this._splitFields.splice(index, 1);
  }
}
