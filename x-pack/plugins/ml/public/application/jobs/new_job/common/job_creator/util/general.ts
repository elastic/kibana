/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import { ES_FIELD_TYPES } from '@kbn/data-plugin/public';
import { Job, Datafeed, Detector } from '../../../../../../../common/types/anomaly_detection_jobs';
import { newJobCapsService } from '../../../../../services/new_job_capabilities/new_job_capabilities_service';
import { NavigateToPath } from '../../../../../contexts/kibana';
import {
  ML_JOB_AGGREGATION,
  SPARSE_DATA_AGGREGATIONS,
} from '../../../../../../../common/constants/aggregation_types';
import {
  MLCATEGORY,
  DOC_COUNT,
  _DOC_COUNT,
} from '../../../../../../../common/constants/field_types';
import {
  EVENT_RATE_FIELD_ID,
  Field,
  AggFieldPair,
  mlCategory,
} from '../../../../../../../common/types/fields';
import { mlJobService } from '../../../../../services/job_service';
import { JobCreatorType } from '..';
import { CREATED_BY_LABEL, JOB_TYPE } from '../../../../../../../common/constants/new_job';

const getFieldByIdFactory = (additionalFields: Field[]) => (id: string) => {
  let field = newJobCapsService.getFieldById(id);
  // if no field could be found it may be a pretend field, like mlcategory or a script field
  if (field === null) {
    if (id === MLCATEGORY) {
      field = mlCategory;
    } else if (additionalFields.length) {
      field = additionalFields.find((f) => f.id === id) || null;
    }
  }
  return field;
};

// populate the detectors with Field and Agg objects loaded from the job capabilities service
export function getRichDetectors(
  job: Job,
  datafeed: Datafeed,
  additionalFields: Field[],
  advanced: boolean = false
) {
  const detectors = advanced ? getDetectorsAdvanced(job, datafeed) : getDetectors(job, datafeed);

  const getFieldById = getFieldByIdFactory(additionalFields);

  return detectors.map((d) => {
    let field = null;
    let byField = null;
    let overField = null;
    let partitionField = null;

    if (d.field_name !== undefined) {
      field = getFieldById(d.field_name);
    }
    if (d.by_field_name !== undefined) {
      byField = getFieldById(d.by_field_name);
    }
    if (d.over_field_name !== undefined) {
      overField = getFieldById(d.over_field_name);
    }
    if (d.partition_field_name !== undefined) {
      partitionField = getFieldById(d.partition_field_name);
    }

    return {
      agg: newJobCapsService.getAggById(d.function),
      field,
      byField,
      overField,
      partitionField,
      excludeFrequent: d.exclude_frequent ?? null,
      description: d.detector_description ?? null,
      useNull: d.use_null ?? null,
    };
  });
}

export function createFieldOptions(fields: Field[], additionalFields: Field[]) {
  return [
    ...fields
      .filter((f) => f.id !== EVENT_RATE_FIELD_ID)
      .map((f) => ({
        label: f.name,
      })),
    ...additionalFields
      .filter((f) => fields.some((f2) => f2.id === f.id) === false)
      .map((f) => ({
        label: f.id,
      })),
  ].sort((a, b) => a.label.localeCompare(b.label));
}

export function createMlcategoryFieldOption(categorizationFieldName: string | null) {
  if (categorizationFieldName === null) {
    return [];
  }
  return [
    {
      label: MLCATEGORY,
    },
  ];
}

export function createDocCountFieldOption(usingAggregations: boolean) {
  return usingAggregations
    ? [
        {
          label: DOC_COUNT,
        },
      ]
    : [
        {
          label: _DOC_COUNT,
        },
      ];
}

function getDetectorsAdvanced(job: Job, datafeed: Datafeed) {
  return processFieldlessAggs(job.analysis_config.detectors);
}

function getDetectors(job: Job, datafeed: Datafeed) {
  let detectors = job.analysis_config.detectors;
  const sparseData = isSparseDataJob(job, datafeed);

  // if aggregations have been used in a single metric job and a distinct count detector
  // was used, we need to rebuild the detector.
  if (
    datafeed.aggregations !== undefined &&
    job.analysis_config.detectors[0].function === ML_JOB_AGGREGATION.NON_ZERO_COUNT &&
    sparseData === false
  ) {
    // distinct count detector, field has been removed.
    // determine field from datafeed aggregations
    const field = datafeed?.aggregations?.buckets?.aggregations?.dc_region?.cardinality
      ?.field as string;

    if (field !== undefined) {
      detectors = [
        {
          function: ML_JOB_AGGREGATION.DISTINCT_COUNT,
          field_name: field,
        },
      ];
    }
  } else {
    // all other detectors.
    detectors = processFieldlessAggs(detectors);
    detectors = detectors.map((d) => {
      switch (d.function) {
        // if sparse data functions were used, replace them with their non-sparse versions
        // the sparse data flag has already been determined and set, so this information is not being lost.
        case ML_JOB_AGGREGATION.NON_ZERO_COUNT:
          return { ...d, field_name: EVENT_RATE_FIELD_ID, function: ML_JOB_AGGREGATION.COUNT };

        case ML_JOB_AGGREGATION.HIGH_NON_ZERO_COUNT:
          return { ...d, field_name: EVENT_RATE_FIELD_ID, function: ML_JOB_AGGREGATION.HIGH_COUNT };

        case ML_JOB_AGGREGATION.LOW_NON_ZERO_COUNT:
          return { ...d, field_name: EVENT_RATE_FIELD_ID, function: ML_JOB_AGGREGATION.LOW_COUNT };

        case ML_JOB_AGGREGATION.NON_NULL_SUM:
          return { ...d, function: ML_JOB_AGGREGATION.SUM };

        case ML_JOB_AGGREGATION.HIGH_NON_NULL_SUM:
          return { ...d, function: ML_JOB_AGGREGATION.HIGH_SUM };

        case ML_JOB_AGGREGATION.LOW_NON_NULL_SUM:
          return { ...d, function: ML_JOB_AGGREGATION.LOW_SUM };

        default:
          return d;
      }
    });
  }
  return detectors;
}

// if a fieldless function is used, add EVENT_RATE_FIELD_ID as its field
function processFieldlessAggs(detectors: Detector[]) {
  return detectors.map((d) => {
    switch (d.function) {
      case ML_JOB_AGGREGATION.COUNT:
      case ML_JOB_AGGREGATION.HIGH_COUNT:
      case ML_JOB_AGGREGATION.LOW_COUNT:
      case ML_JOB_AGGREGATION.NON_ZERO_COUNT:
      case ML_JOB_AGGREGATION.HIGH_NON_ZERO_COUNT:
      case ML_JOB_AGGREGATION.LOW_NON_ZERO_COUNT:
      case ML_JOB_AGGREGATION.RARE:
      case ML_JOB_AGGREGATION.FREQ_RARE:
      case ML_JOB_AGGREGATION.TIME_OF_DAY:
      case ML_JOB_AGGREGATION.TIME_OF_WEEK:
        return { ...d, field_name: EVENT_RATE_FIELD_ID };
      default:
        return d;
    }
  });
}

// determine whether the job has been configured to run on sparse data
// by looking to see whether the datafeed contains a dc_region field in an aggregation
// if it does, it is a distinct count single metric job and no a sparse data job.
// this check is needed because distinct count jobs also use NON_ZERO_COUNT
export function isSparseDataJob(job: Job, datafeed: Datafeed): boolean {
  const detectors = job.analysis_config.detectors;

  const distinctCountField = datafeed?.aggregations?.buckets?.aggregations?.dc_region?.cardinality
    ?.field as string;

  // if distinctCountField is undefined, and any detectors contain a sparse data function
  // return true
  if (distinctCountField === undefined) {
    for (const detector of detectors) {
      if (SPARSE_DATA_AGGREGATIONS.includes(detector.function as ML_JOB_AGGREGATION)) {
        return true;
      }
    }
  }
  return false;
}

function stashJobForCloning(
  jobCreator: JobCreatorType,
  skipTimeRangeStep: boolean = false,
  includeTimeRange: boolean = false
) {
  mlJobService.tempJobCloningObjects.job = jobCreator.jobConfig;
  mlJobService.tempJobCloningObjects.datafeed = jobCreator.datafeedConfig;
  mlJobService.tempJobCloningObjects.createdBy = jobCreator.createdBy ?? undefined;

  // skip over the time picker step of the wizard
  mlJobService.tempJobCloningObjects.skipTimeRangeStep = skipTimeRangeStep;

  if (includeTimeRange === true) {
    // auto select the start and end dates of the time picker
    mlJobService.tempJobCloningObjects.start = jobCreator.start;
    mlJobService.tempJobCloningObjects.end = jobCreator.end;
  }

  mlJobService.tempJobCloningObjects.calendars = jobCreator.calendars;
}

export function convertToMultiMetricJob(
  jobCreator: JobCreatorType,
  navigateToPath: NavigateToPath
) {
  jobCreator.createdBy = CREATED_BY_LABEL.MULTI_METRIC;
  jobCreator.modelPlot = false;
  stashJobForCloning(jobCreator, true, true);
  navigateToPath(`jobs/new_job/${JOB_TYPE.MULTI_METRIC}`, true);
}

export function convertToAdvancedJob(jobCreator: JobCreatorType, navigateToPath: NavigateToPath) {
  jobCreator.createdBy = null;
  stashJobForCloning(jobCreator, true, true);
  navigateToPath(`jobs/new_job/${JOB_TYPE.ADVANCED}`, true);
}

export function resetAdvancedJob(jobCreator: JobCreatorType, navigateToPath: NavigateToPath) {
  jobCreator.createdBy = null;
  stashJobForCloning(jobCreator, true, false);
  navigateToPath('/jobs/new_job');
}

export function resetJob(jobCreator: JobCreatorType, navigateToPath: NavigateToPath) {
  jobCreator.jobId = '';
  stashJobForCloning(jobCreator, true, true);
  navigateToPath('/jobs/new_job');
}

export function advancedStartDatafeed(
  jobCreator: JobCreatorType | null,
  navigateToPath: NavigateToPath
) {
  if (jobCreator !== null) {
    stashJobForCloning(jobCreator, false, false);
  }
  navigateToPath('/jobs');
}

export function aggFieldPairsCanBeCharted(afs: AggFieldPair[]) {
  return afs.some((a) => a.agg.dslName === null) === false;
}

export function getJobCreatorTitle(jobCreator: JobCreatorType) {
  switch (jobCreator.type) {
    case JOB_TYPE.SINGLE_METRIC:
      return i18n.translate('xpack.ml.newJob.wizard.jobCreatorTitle.singleMetric', {
        defaultMessage: 'Single metric',
      });
    case JOB_TYPE.MULTI_METRIC:
      return i18n.translate('xpack.ml.newJob.wizard.jobCreatorTitle.multiMetric', {
        defaultMessage: 'Multi-metric',
      });
    case JOB_TYPE.POPULATION:
      return i18n.translate('xpack.ml.newJob.wizard.jobCreatorTitle.population', {
        defaultMessage: 'Population',
      });
    case JOB_TYPE.ADVANCED:
      return i18n.translate('xpack.ml.newJob.wizard.jobCreatorTitle.advanced', {
        defaultMessage: 'Advanced',
      });
    case JOB_TYPE.CATEGORIZATION:
      return i18n.translate('xpack.ml.newJob.wizard.jobCreatorTitle.categorization', {
        defaultMessage: 'Categorization',
      });
    case JOB_TYPE.RARE:
      return i18n.translate('xpack.ml.newJob.wizard.jobCreatorTitle.rare', {
        defaultMessage: 'Rare',
      });
    default:
      return '';
  }
}

// recurse through a datafeed aggregation object,
// adding top level keys from each nested agg to an array
// of fields
export function collectAggs(o: any, aggFields: Field[]) {
  for (const i in o) {
    if (o[i] !== null && typeof o[i] === 'object') {
      if (i === 'aggregations' || i === 'aggs') {
        Object.keys(o[i]).forEach((k) => {
          if (k !== 'aggregations' && k !== 'aggs') {
            aggFields.push({
              id: k,
              name: k,
              type: ES_FIELD_TYPES.KEYWORD,
              aggregatable: true,
            });
          }
        });
      }
      collectAggs(o[i], aggFields);
    }
  }
}
