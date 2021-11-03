/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedSearchSavedObject } from '../../../../../../common/types/kibana';
import { JobCreator } from './job_creator';
import {
  Field,
  Aggregation,
  SplitField,
  AggFieldPair,
} from '../../../../../../common/types/fields';
import { Job, Datafeed, Detector } from '../../../../../../common/types/anomaly_detection_jobs';
import { createBasicDetector } from './util/default_configs';
import { JOB_TYPE, CREATED_BY_LABEL } from '../../../../../../common/constants/new_job';
import { getRichDetectors } from './util/general';
import type { DataView } from '../../../../../../../../../src/plugins/data_views/public';

export class PopulationJobCreator extends JobCreator {
  // a population job has one overall over (split) field, which is the same for all detectors
  // each detector has an optional by field
  private _populatonField: SplitField = null;
  private _byFields: SplitField[] = [];
  protected _type: JOB_TYPE = JOB_TYPE.POPULATION;

  constructor(indexPattern: DataView, savedSearch: SavedSearchSavedObject | null, query: object) {
    super(indexPattern, savedSearch, query);
    this.createdBy = CREATED_BY_LABEL.POPULATION;
    this._wizardInitialized$.next(true);
  }

  // add a by field to a specific detector
  public setByField(field: SplitField, index: number) {
    if (field === null) {
      this.removeByField(index);
    } else {
      if (this._detectors[index] !== undefined) {
        this._byFields[index] = field;
        this._detectors[index].by_field_name = field.id;
      }
    }
  }

  // remove a by field from a specific detector
  public removeByField(index: number) {
    if (this._detectors[index] !== undefined) {
      this._byFields[index] = null;
      delete this._detectors[index].by_field_name;
    }
  }

  // get the by field for a specific detector
  public getByField(index: number): SplitField {
    if (this._byFields[index] === undefined) {
      return null;
    }
    return this._byFields[index];
  }

  // add an over field to all detectors
  public setPopulationField(field: SplitField) {
    this._populatonField = field;

    if (this._populatonField === null) {
      this.removePopulationField();
    } else {
      for (let i = 0; i < this._detectors.length; i++) {
        this._detectors[i].over_field_name = this._populatonField.id;
      }
    }
  }

  // remove over field from all detectors
  public removePopulationField() {
    this._detectors.forEach((d) => {
      delete d.over_field_name;
    });
  }

  public get populationField(): SplitField {
    return this._populatonField;
  }

  public addDetector(agg: Aggregation, field: Field) {
    const dtr: Detector = this._createDetector(agg, field);

    this._addDetector(dtr, agg, field);
    this._byFields.push(null);
  }

  // edit a specific detector, reapplying the by field
  // already set on the the detector at that index
  public editDetector(agg: Aggregation, field: Field, index: number) {
    const dtr: Detector = this._createDetector(agg, field);

    const sp = this._byFields[index];
    if (sp !== undefined && sp !== null) {
      dtr.by_field_name = sp.id;
    }

    this._editDetector(dtr, agg, field, index);
  }

  // create a detector object, adding the current over field
  private _createDetector(agg: Aggregation, field: Field) {
    const dtr: Detector = createBasicDetector(agg, field);

    if (this._populatonField !== null) {
      dtr.over_field_name = this._populatonField.id;
    }
    return dtr;
  }

  public removeDetector(index: number) {
    this._removeDetector(index);
    this._byFields.splice(index, 1);
  }

  public get aggFieldPairs(): AggFieldPair[] {
    return this.detectors.map((d, i) => ({
      field: this._fields[i],
      agg: this._aggs[i],
      by: {
        field: this._byFields[i],
        value: null,
      },
    }));
  }

  public cloneFromExistingJob(job: Job, datafeed: Datafeed) {
    this._overrideConfigs(job, datafeed);
    this.createdBy = CREATED_BY_LABEL.POPULATION;
    const detectors = getRichDetectors(job, datafeed, this.additionalFields, false);

    this.removeAllDetectors();

    if (detectors.length) {
      if (detectors[0].overField !== null) {
        this.setPopulationField(detectors[0].overField);
      }
    }
    detectors.forEach((d, i) => {
      const dtr = detectors[i];
      if (dtr.agg !== null && dtr.field !== null) {
        this.addDetector(dtr.agg, dtr.field);
        if (dtr.byField !== null) {
          this.setByField(dtr.byField, i);
        }
      }
    });
  }
}
