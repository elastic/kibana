/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedSearchSavedObject } from '../../../../../../common/types/kibana';
import { JobCreator } from './job_creator';
import { Field, SplitField } from '../../../../../../common/types/fields';
import { Job, Datafeed } from '../../../../../../common/types/anomaly_detection_jobs';
import { JOB_TYPE, CREATED_BY_LABEL } from '../../../../../../common/constants/new_job';
import { getRichDetectors } from './util/general';
import { IndexPattern } from '../../../../../../../../../src/plugins/data/public';
import { isSparseDataJob } from './util/general';
import { ML_JOB_AGGREGATION } from '../../../../../../common/constants/aggregation_types';

export class RareJobCreator extends JobCreator {
  // a multi-metric job has one optional overall partition field
  // which is the same for all detectors.
  private _rareField: Field | null = null;
  private _populationField: SplitField = null;
  private _splitField: SplitField = null;

  protected _type: JOB_TYPE = JOB_TYPE.RARE;
  private _rareInPopulation: boolean = false;
  private _frequentlyRare: boolean = false;

  constructor(
    indexPattern: IndexPattern,
    savedSearch: SavedSearchSavedObject | null,
    query: object
  ) {
    super(indexPattern, savedSearch, query);
    this.createdBy = CREATED_BY_LABEL.RARE;
    this._wizardInitialized$.next(true);
  }

  public setRareField(field: Field | null) {
    this._rareField = field;

    if (field === null) {
      this.removePopulationField();
      this.removeSplitField();
      this._detectors.length = 0;
      return;
    }

    if (this._detectors.length === 0) {
      this._detectors.push({ function: ML_JOB_AGGREGATION.RARE });
    }

    this._detectors[0].by_field_name = field.id;
  }

  public get rareField() {
    return this._rareField;
  }

  public get rareInPopulation() {
    return this._rareInPopulation;
  }

  public set rareInPopulation(bool: boolean) {
    this._rareInPopulation = bool;
    if (bool === false) {
      this.removePopulationField();
    }
  }

  public get frequentlyRare() {
    return this._frequentlyRare;
  }

  public set frequentlyRare(bool: boolean) {
    this._frequentlyRare = bool;
    if (this._detectors.length) {
      this._detectors[0].function = bool ? ML_JOB_AGGREGATION.FREQ_RARE : ML_JOB_AGGREGATION.RARE;
    }
  }

  // set the population field, applying it to each detector
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
    this._populationField = null;
    this._detectors.forEach((d) => {
      delete d.over_field_name;
    });
  }

  public get populationField(): SplitField {
    return this._populationField;
  }

  // set the split field, applying it to each detector
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

  // public addDetector(agg: Aggregation, field: Field) {
  //   const dtr: Detector = this._createDetector(agg, field);
  //   this._addDetector(dtr, agg, field);
  // }

  // public editDetector(agg: Aggregation, field: Field, index: number) {
  //   const dtr: Detector = this._createDetector(agg, field);
  //   this._editDetector(dtr, agg, field, index);
  // }

  // create a new detector object, applying the overall split field
  // private _createDetector(agg: Aggregation, field: Field) {
  //   const dtr: Detector = createBasicDetector(agg, field);

  //   if (this._splitField !== null) {
  //     dtr.partition_field_name = this._splitField.id;
  //   }
  //   return dtr;
  // }

  // public removeDetector(index: number) {
  //   this._removeDetector(index);
  // }

  // public get aggFieldPairs(): AggFieldPair[] {
  //   return this.detectors.map((d, i) => ({
  //     field: this._fields[i],
  //     agg: this._aggs[i],
  //   }));
  // }

  public cloneFromExistingJob(job: Job, datafeed: Datafeed) {
    this._overrideConfigs(job, datafeed);
    this.createdBy = CREATED_BY_LABEL.RARE;
    this._sparseData = isSparseDataJob(job, datafeed);
    const detectors = getRichDetectors(job, datafeed, this.additionalFields, false);

    this.removeSplitField();
    this.removePopulationField();
    this.removeAllDetectors();

    if (detectors.length) {
      this.setRareField(detectors[0].byField);
      this.frequentlyRare = detectors[0].agg?.id === ML_JOB_AGGREGATION.FREQ_RARE;

      if (detectors[0].overField !== null) {
        this.setPopulationField(detectors[0].overField);
        this.rareInPopulation = true;
      }
      if (detectors[0].partitionField !== null) {
        this.setSplitField(detectors[0].partitionField);
      }
    }
  }
}
