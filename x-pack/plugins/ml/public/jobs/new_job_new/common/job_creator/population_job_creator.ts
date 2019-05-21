/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { JobCreator } from './job_creator';
import { Field, Aggregation, SplitField } from '../../../../../common/types/fields';
import { Detector } from './configs';
import { createBasicDetector } from './util/default_configs';

export class PopulationJobCreator extends JobCreator {
  // a population job has one overall over field, which is the same for all detectors
  // each detector has an optional by field
  private _populationField: SplitField = null;
  private _splitFields: SplitField[] = [];

  // add a by field to a specific detector
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

  // remove a by field from a specific detector
  public removeSplitField(index: number) {
    if (this._detectors[index] !== undefined) {
      this._splitFields[index] = null;
      delete this._detectors[index].by_field_name;
    }
  }

  // get the by field for a specific detector
  public getSplitField(index: number): SplitField {
    if (this._splitFields[index] === undefined) {
      return null;
    }
    return this._splitFields[index];
  }

  // add an over field to all detectors
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

  // remove over field from all detectors
  public removePopulationField() {
    this._detectors.forEach(d => {
      delete d.over_field_name;
    });
  }

  public get populationField(): SplitField {
    return this._populationField;
  }

  public addDetector(agg: Aggregation, field: Field | null) {
    const dtr: Detector = this._createDetector(agg, field);

    this._addDetector(dtr);
    this._splitFields.push(null);
  }

  // edit a specific detector, reapplying the by field
  // already set on the the detector at that index
  public editDetector(agg: Aggregation, field: Field | null, index: number) {
    const dtr: Detector = this._createDetector(agg, field);

    const sp = this._splitFields[index];
    if (sp !== undefined && sp !== null) {
      dtr.by_field_name = sp.id;
    }

    this._editDetector(dtr, index);
  }

  // create a detector object, adding the current over field and
  private _createDetector(agg: Aggregation, field: Field | null) {
    const dtr: Detector = createBasicDetector(agg, field);

    if (field !== null) {
      dtr.field_name = field.id;
    }

    if (this._populationField !== null) {
      dtr.over_field_name = this._populationField.id;
    }
    return dtr;
  }

  public removeDetector(index: number) {
    this._removeDetector(index);
    this._splitFields.splice(index, 1);
  }
}
