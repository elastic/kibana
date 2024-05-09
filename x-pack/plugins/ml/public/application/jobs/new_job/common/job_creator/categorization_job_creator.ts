/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual } from 'lodash';
import type { DataView } from '@kbn/data-views-plugin/public';
import {
  type Field,
  type Aggregation,
  mlCategory,
  ML_JOB_AGGREGATION,
} from '@kbn/ml-anomaly-utils';
import type { SavedSearch } from '@kbn/saved-search-plugin/public';
import {
  type CategorizationAnalyzer,
  type CategoryFieldExample,
  type FieldExampleCheck,
  VALIDATION_RESULT,
  CATEGORY_EXAMPLES_VALIDATION_STATUS,
} from '@kbn/ml-category-validator';
import { JobCreator } from './job_creator';
import type {
  Job,
  Datafeed,
  Detector,
} from '../../../../../../common/types/anomaly_detection_jobs';
import { createBasicDetector } from './util/default_configs';
import {
  JOB_TYPE,
  CREATED_BY_LABEL,
  DEFAULT_BUCKET_SPAN,
  DEFAULT_RARE_BUCKET_SPAN,
} from '../../../../../../common/constants/new_job';

import { getRichDetectors } from './util/general';
import { CategorizationExamplesLoader } from '../results_loader';
import { getNewJobDefaults } from '../../../../services/ml_server_info';
import { isCcsIndexPattern } from '../../../../util/index_utils';

type DetectorType =
  | ML_JOB_AGGREGATION.COUNT
  | ML_JOB_AGGREGATION.HIGH_COUNT
  | ML_JOB_AGGREGATION.RARE;

export class CategorizationJobCreator extends JobCreator {
  protected _type: JOB_TYPE = JOB_TYPE.CATEGORIZATION;
  private _createCountDetector: () => void = () => {};
  private _createHighCountDetector: () => void = () => {};
  private _createRareDetector: () => void = () => {};
  private _examplesLoader: CategorizationExamplesLoader;
  private _categoryFieldExamples: CategoryFieldExample[] = [];
  private _validationChecks: FieldExampleCheck[] = [];
  private _overallValidStatus: CATEGORY_EXAMPLES_VALIDATION_STATUS =
    CATEGORY_EXAMPLES_VALIDATION_STATUS.INVALID;
  private _detectorType: DetectorType = ML_JOB_AGGREGATION.COUNT;
  private _categorizationAnalyzer: CategorizationAnalyzer = {};
  private _defaultCategorizationAnalyzer: CategorizationAnalyzer;
  private _partitionFieldName: string | null = null;
  private _ccsVersionFailure: boolean = false;

  constructor(indexPattern: DataView, savedSearch: SavedSearch | null, query: object) {
    super(indexPattern, savedSearch, query);
    this.createdBy = CREATED_BY_LABEL.CATEGORIZATION;
    this._examplesLoader = new CategorizationExamplesLoader(this, indexPattern, query);

    const { anomaly_detectors: anomalyDetectors } = getNewJobDefaults();
    this._defaultCategorizationAnalyzer = anomalyDetectors.categorization_analyzer || {};
  }

  public setDefaultDetectorProperties(
    count: Aggregation | null,
    highCount: Aggregation | null,
    rare: Aggregation | null,
    eventRate: Field | null
  ) {
    if (count === null || highCount === null || rare === null || eventRate === null) {
      throw Error('event_rate field or count or rare aggregations missing');
    }

    this._createCountDetector = () => {
      this._createDetector(count, eventRate);
    };
    this._createHighCountDetector = () => {
      this._createDetector(highCount, eventRate);
    };
    this._createRareDetector = () => {
      this._createDetector(rare, eventRate);
    };
  }

  private _createDetector(agg: Aggregation, field: Field) {
    const dtr: Detector = createBasicDetector(agg, field);
    dtr.by_field_name = mlCategory.id;

    // API requires if per_partition_categorization is enabled, add partition field to the detector
    if (this.perPartitionCategorization && this.categorizationPerPartitionField !== null) {
      dtr.partition_field_name = this.categorizationPerPartitionField;
    }
    this._addDetector(dtr, agg, mlCategory);
  }

  public setDetectorType(type: DetectorType) {
    this._detectorType = type;
    this.removeAllDetectors();
    if (type === ML_JOB_AGGREGATION.COUNT) {
      this._createCountDetector();
      this.bucketSpan = DEFAULT_BUCKET_SPAN;
    } else if (type === ML_JOB_AGGREGATION.HIGH_COUNT) {
      this._createHighCountDetector();
      this.bucketSpan = DEFAULT_BUCKET_SPAN;
    } else {
      this._createRareDetector();
      this.bucketSpan = DEFAULT_RARE_BUCKET_SPAN;
      this.modelPlot = false;
    }
  }

  public set categorizationFieldName(fieldName: string | null) {
    if (fieldName !== null) {
      this._job_config.analysis_config.categorization_field_name = fieldName;
      this.setDetectorType(this._detectorType);
      this.addInfluencer(mlCategory.id);
    } else {
      delete this._job_config.analysis_config.categorization_field_name;
      this._categoryFieldExamples = [];
      this._validationChecks = [];
      this._overallValidStatus = CATEGORY_EXAMPLES_VALIDATION_STATUS.INVALID;
    }
  }

  public get categorizationFieldName(): string | null {
    return this._job_config.analysis_config.categorization_field_name || null;
  }

  public async loadCategorizationFieldExamples() {
    const { examples, sampleSize, overallValidStatus, validationChecks } =
      await this._examplesLoader.loadExamples();
    const categoryFieldExamples = examples ?? [];
    this._categoryFieldExamples = categoryFieldExamples;
    this._validationChecks = validationChecks;
    this._overallValidStatus = overallValidStatus;

    this._ccsVersionFailure = this._checkCcsFailure(
      categoryFieldExamples,
      overallValidStatus,
      validationChecks
    );
    if (this._ccsVersionFailure === true) {
      // if the data view contains a cross-cluster search, one of the clusters may
      // be on a version which doesn't support the fields API (e.g. 6.8)
      // and so the categorization examples endpoint will fail
      // if this is the case, we need to allow the user to progress in the wizard.
      this._overallValidStatus = CATEGORY_EXAMPLES_VALIDATION_STATUS.VALID;
    }

    this._wizardInitialized$.next(true);

    return {
      examples: categoryFieldExamples,
      sampleSize,
      overallValidStatus,
      validationChecks,
      ccsVersionFailure: this._ccsVersionFailure,
    };
  }

  // Check to see if the examples failed due to a cross-cluster search being used
  private _checkCcsFailure(
    examples: CategoryFieldExample[],
    status: CATEGORY_EXAMPLES_VALIDATION_STATUS,
    checks: FieldExampleCheck[]
  ) {
    return (
      examples.length === 0 &&
      status === CATEGORY_EXAMPLES_VALIDATION_STATUS.INVALID &&
      checks[0]?.id === VALIDATION_RESULT.NO_EXAMPLES &&
      isCcsIndexPattern(this.indexPatternTitle)
    );
  }

  public get categoryFieldExamples() {
    return this._categoryFieldExamples;
  }

  public get validationChecks() {
    return this._validationChecks;
  }

  public get overallValidStatus() {
    return this._overallValidStatus;
  }

  public get selectedDetectorType() {
    return this._detectorType;
  }

  public set categorizationAnalyzer(analyzer: CategorizationAnalyzer) {
    this._categorizationAnalyzer = analyzer;

    if (isEqual(this._categorizationAnalyzer, this._defaultCategorizationAnalyzer)) {
      delete this._job_config.analysis_config.categorization_analyzer;
    } else {
      this._job_config.analysis_config.categorization_analyzer = analyzer;
    }
  }

  public get categorizationAnalyzer() {
    return this._categorizationAnalyzer;
  }

  public get categorizationPerPartitionField() {
    return this._partitionFieldName;
  }

  public set categorizationPerPartitionField(fieldName: string | null) {
    if (fieldName === null) {
      this._detectors.forEach((detector) => {
        delete detector.partition_field_name;
      });
      if (this._partitionFieldName !== null) this.removeInfluencer(this._partitionFieldName);
      this._partitionFieldName = null;
    } else {
      if (this._partitionFieldName !== fieldName) {
        // remove the previous field from list of influencers
        // and add the new one
        if (this._partitionFieldName !== null) this.removeInfluencer(this._partitionFieldName);
        this.addInfluencer(fieldName);
        this._partitionFieldName = fieldName;
        this._detectors.forEach((detector) => {
          detector.partition_field_name = fieldName;
        });
      }
    }
  }

  // override the setter and getter for the per-partition toggle
  // so we can remove the partition field in the wizard when
  // per-partition categorization is disabled.
  public get perPartitionCategorization() {
    return this._job_config.analysis_config.per_partition_categorization?.enabled === true;
  }

  public set perPartitionCategorization(enabled: boolean) {
    this._initPerPartitionCategorization();
    this._job_config.analysis_config.per_partition_categorization!.enabled = enabled;
    if (enabled === false) {
      this.categorizationPerPartitionField = null;
    }
  }

  public cloneFromExistingJob(job: Job, datafeed: Datafeed) {
    this._overrideConfigs(job, datafeed);
    this.createdBy = CREATED_BY_LABEL.CATEGORIZATION;
    const detectors = getRichDetectors(job, datafeed, this.additionalFields, false);

    const dtr = detectors[0];
    if (dtr !== undefined && dtr.agg !== null && dtr.field !== null) {
      let detectorType: DetectorType;
      if (dtr.agg.id === ML_JOB_AGGREGATION.COUNT) {
        detectorType = ML_JOB_AGGREGATION.COUNT;
      } else if (dtr.agg.id === ML_JOB_AGGREGATION.HIGH_COUNT) {
        detectorType = ML_JOB_AGGREGATION.HIGH_COUNT;
      } else {
        detectorType = ML_JOB_AGGREGATION.RARE;
      }

      const bs = job.analysis_config.bucket_span!;
      this.setDetectorType(detectorType);
      if (dtr.partitionField !== null) {
        this.categorizationPerPartitionField = dtr.partitionField.id;
      }

      // set the bucketspan back to the original value
      // as setDetectorType applies a default
      this.bucketSpan = bs;
    }
  }
}
