/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataView } from '@kbn/data-views-plugin/public';
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
import { isSparseDataJob } from './util/general';

export class GeoJobCreator extends JobCreator {
  private _geoField: Field | null = null;
  private _geoAgg: Aggregation | null = null;
  // set partitionField as the default split field for geo jobs
  private _splitField: SplitField = null;

  protected _type: JOB_TYPE = JOB_TYPE.GEO;

  constructor(indexPattern: DataView, savedSearch: SavedSearchSavedObject | null, query: object) {
    super(indexPattern, savedSearch, query);
    this.createdBy = CREATED_BY_LABEL.GEO;
    this._wizardInitialized$.next(true);
  }

  public setDefaultDetectorProperties(geo: Aggregation | null) {
    if (geo === null) {
      throw Error('lat_long aggregations missing');
    }
    this._geoAgg = geo;
  }

  public get geoField() {
    return this._geoField;
  }

  public get geoAgg() {
    return this._geoAgg;
  }

  public setGeoField(field: Field | null) {
    this._geoField = field;

    if (field === null) {
      this.removeSplitField();
      this._removeDetector(0);
      this._detectors.length = 0;
      this._fields.length = 0;
      return;
    }

    const agg = this._geoAgg!;

    this.removeAllDetectors();
    const dtr = this._createDetector(agg, field);
    this._addDetector(dtr, agg, field);
  }

  // set the split field
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
    this._detectors.forEach((d) => {
      delete d.partition_field_name;
    });
  }

  public get splitField(): SplitField {
    return this._splitField;
  }

  // create a new detector object, applying the overall split field
  private _createDetector(agg: Aggregation, field: Field) {
    const dtr: Detector = createBasicDetector(agg, field);

    if (this._splitField !== null) {
      dtr.partition_field_name = this._splitField.id;
    }
    return dtr;
  }

  public get aggFieldPairs(): AggFieldPair[] {
    return this.detectors.map((d, i) => ({
      field: this._fields[i],
      agg: this._aggs[i],
    }));
  }

  public cloneFromExistingJob(job: Job, datafeed: Datafeed) {
    this._overrideConfigs(job, datafeed);
    this.createdBy = CREATED_BY_LABEL.GEO;
    this._sparseData = isSparseDataJob(job, datafeed);
    const detectors = getRichDetectors(job, datafeed, this.additionalFields, false);

    this.removeSplitField();
    this.removeAllDetectors();
    this.removeAllDetectors();

    if (detectors.length) {
      this.setGeoField(detectors[0].field);
      if (detectors[0].partitionField !== null) {
        this.setSplitField(detectors[0].partitionField);
      }
    }
  }
}
