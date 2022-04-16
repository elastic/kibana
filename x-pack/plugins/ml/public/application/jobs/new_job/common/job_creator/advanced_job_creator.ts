/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { DataView } from '@kbn/data-views-plugin/public';
import { SavedSearchSavedObject } from '../../../../../../common/types/kibana';

import { JobCreator } from './job_creator';
import { Field, Aggregation, SplitField } from '../../../../../../common/types/fields';
import {
  Job,
  Datafeed,
  Detector,
  CustomRule,
} from '../../../../../../common/types/anomaly_detection_jobs';
import { createBasicDetector } from './util/default_configs';
import { JOB_TYPE } from '../../../../../../common/constants/new_job';
import { getRichDetectors } from './util/general';
import { isValidJson } from '../../../../../../common/util/validation_utils';
import { ml } from '../../../../services/ml_api_service';

export interface RichDetector {
  agg: Aggregation | null;
  field: SplitField;
  byField: SplitField;
  overField: SplitField;
  partitionField: SplitField;
  excludeFrequent: estypes.MlExcludeFrequent | null;
  description: string | null;
  customRules: CustomRule[] | null;
  useNull: boolean | null;
}

export class AdvancedJobCreator extends JobCreator {
  protected _type: JOB_TYPE = JOB_TYPE.ADVANCED;
  private _richDetectors: RichDetector[] = [];
  private _queryString: string;

  constructor(indexPattern: DataView, savedSearch: SavedSearchSavedObject | null, query: object) {
    super(indexPattern, savedSearch, query);

    this._queryString = JSON.stringify(this._datafeed_config.query);

    this._wizardInitialized$.next(true);
  }

  public addDetector(
    agg: Aggregation,
    field: Field,
    byField: SplitField,
    overField: SplitField,
    partitionField: SplitField,
    excludeFrequent: estypes.MlExcludeFrequent | null,
    description: string | null,
    useNull: boolean | null
  ) {
    // addDetector doesn't support adding new custom rules.
    // this will be added in the future once it's supported in the UI
    const customRules = null;
    const { detector, richDetector } = this._createDetector(
      agg,
      field,
      byField,
      overField,
      partitionField,
      excludeFrequent,
      description,
      customRules,
      useNull
    );

    this._addDetector(detector, agg, field);
    this._richDetectors.push(richDetector);
  }

  public editDetector(
    agg: Aggregation,
    field: Field,
    byField: SplitField,
    overField: SplitField,
    partitionField: SplitField,
    excludeFrequent: estypes.MlExcludeFrequent | null,
    description: string | null,
    index: number,
    useNull: boolean | null
  ) {
    const customRules =
      this._detectors[index] !== undefined ? this._detectors[index].custom_rules || null : null;

    const { detector, richDetector } = this._createDetector(
      agg,
      field,
      byField,
      overField,
      partitionField,
      excludeFrequent,
      description,
      customRules,
      useNull
    );

    this._editDetector(detector, agg, field, index);

    if (this._richDetectors[index] !== undefined) {
      this._richDetectors[index] = richDetector;
    }
  }

  private _createDetector(
    agg: Aggregation,
    field: Field,
    byField: SplitField,
    overField: SplitField,
    partitionField: SplitField,
    excludeFrequent: estypes.MlExcludeFrequent | null,
    description: string | null,
    customRules: CustomRule[] | null,
    useNull: boolean | null
  ): { detector: Detector; richDetector: RichDetector } {
    const detector: Detector = createBasicDetector(agg, field);

    if (byField !== null) {
      detector.by_field_name = byField.id;
    }
    if (overField !== null) {
      detector.over_field_name = overField.id;
    }
    if (partitionField !== null) {
      detector.partition_field_name = partitionField.id;
    }
    if (excludeFrequent !== null) {
      detector.exclude_frequent = excludeFrequent;
    }
    if (description !== null) {
      detector.detector_description = description;
    }
    if (customRules !== null) {
      detector.custom_rules = customRules;
    }
    if (useNull !== null) {
      detector.use_null = useNull;
    }

    const richDetector: RichDetector = {
      agg,
      field,
      byField,
      overField,
      partitionField,
      excludeFrequent,
      description,
      customRules,
      useNull,
    };

    return { detector, richDetector };
  }

  public removeDetector(index: number) {
    this._removeDetector(index);
    this._richDetectors.splice(index, 1);
  }

  public get richDetectors(): RichDetector[] {
    return this._richDetectors;
  }

  public get queryString(): string {
    return this._queryString;
  }

  public set queryString(qs: string) {
    this._queryString = qs;
  }

  public get isValidQueryString(): boolean {
    return isValidJson(this._queryString);
  }

  // load the start and end times for the selected index
  // and apply them to the job creator
  public async autoSetTimeRange() {
    const { start, end } = await ml.getTimeFieldRange({
      index: this._indexPatternTitle,
      timeFieldName: this.timeFieldName,
      query: this.query,
      runtimeMappings: this.datafeedConfig.runtime_mappings,
      indicesOptions: this.datafeedConfig.indices_options,
    });
    this.setTimeRange(start.epoch, end.epoch);
  }

  public cloneFromExistingJob(job: Job, datafeed: Datafeed) {
    this._overrideConfigs(job, datafeed);
    const detectors = getRichDetectors(job, datafeed, this.additionalFields, true);

    // keep track of the custom rules for each detector
    const customRules = this._detectors.map((d) => d.custom_rules);

    this.removeAllDetectors();
    this._richDetectors.length = 0;

    detectors.forEach((d, i) => {
      const dtr = detectors[i];
      if (dtr.agg !== null && dtr.field !== null) {
        this.addDetector(
          dtr.agg,
          dtr.field,
          dtr.byField,
          dtr.overField,
          dtr.partitionField,
          dtr.excludeFrequent,
          dtr.description,
          dtr.useNull
        );
      }
    });

    // re-apply custom rules
    customRules.forEach((cr, i) => {
      if (cr !== undefined) {
        this._detectors[i].custom_rules = cr;
      }
    });
  }
}
