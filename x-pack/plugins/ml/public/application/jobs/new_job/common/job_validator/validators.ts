/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { distinctUntilChanged, filter, map, switchMap } from 'rxjs/operators';
import { Observable, Subject } from 'rxjs';
import {
  CardinalityModelPlotHigh,
  CardinalityValidationResult,
  ml,
} from '../../../../services/ml_api_service';
import { JobCreator } from '../job_creator';
import { CombinedJob } from '../../../../../../common/types/anomaly_detection_jobs';
import { BasicValidations } from './job_validator';

export enum VALIDATOR_SEVERITY {
  ERROR,
  WARNING,
}

export interface CardinalityValidatorError {
  highCardinality: {
    value: number;
    severity: VALIDATOR_SEVERITY;
  };
}

const jobExistsErrorMessage = i18n.translate(
  'xpack.ml.newJob.wizard.validateJob.jobNameAlreadyExists',
  {
    defaultMessage:
      'Job ID already exists. A job ID cannot be the same as an existing job or group.',
  }
);
const groupExistsErrorMessage = i18n.translate(
  'xpack.ml.newJob.wizard.validateJob.jobNameAlreadyExists',
  {
    defaultMessage:
      'Group ID already exists. A group ID cannot be the same as an existing group or job.',
  }
);

export type CardinalityValidatorResult = CardinalityValidatorError | null;

export type JobExistsResult = {
  jobIdExists: BasicValidations['jobId'];
} | null;
export type GroupsExistResult = {
  groupIdsExist: BasicValidations['groupIds'];
} | null;

export function isCardinalityModelPlotHigh(
  cardinalityValidationResult: CardinalityValidationResult
): cardinalityValidationResult is CardinalityModelPlotHigh {
  return (
    (cardinalityValidationResult as CardinalityModelPlotHigh).modelPlotCardinality !== undefined
  );
}

export function cardinalityValidator(
  jobCreator$: Subject<JobCreator>
): Observable<CardinalityValidatorResult> {
  return jobCreator$.pipe(
    // Perform a cardinality check only with enabled model plot.
    filter((jobCreator) => {
      return jobCreator?.modelPlot;
    }),
    map((jobCreator) => {
      return {
        jobCreator,
        analysisConfigString: JSON.stringify(jobCreator.jobConfig.analysis_config),
      };
    }),
    // No need to perform an API call if the analysis configuration hasn't been changed
    distinctUntilChanged((prev, curr) => {
      return prev.analysisConfigString === curr.analysisConfigString;
    }),
    switchMap(({ jobCreator }) => {
      return ml.validateCardinality$({
        ...jobCreator.jobConfig,
        datafeed_config: jobCreator.datafeedConfig,
      } as CombinedJob);
    }),
    map((validationResults) => {
      for (const validationResult of validationResults) {
        if (isCardinalityModelPlotHigh(validationResult)) {
          return {
            highCardinality: {
              value: validationResult.modelPlotCardinality,
              severity: VALIDATOR_SEVERITY.WARNING,
            },
          };
        }
      }
      return null;
    })
  );
}

export function jobIdValidator(jobCreator$: Subject<JobCreator>): Observable<JobExistsResult> {
  return jobCreator$.pipe(
    map((jobCreator) => {
      return {
        jobCreator,
        jobId: jobCreator.jobId,
      };
    }),
    // No need to perform an API call if the analysis configuration hasn't been changed
    distinctUntilChanged((prev, curr) => {
      return prev.jobId === curr.jobId;
    }),
    switchMap(({ jobId }) => {
      return ml.jobs.jobsExist$([jobId], true);
    }),
    map((jobExistsResults) => {
      const jobs = Object.values(jobExistsResults);
      if (jobs[0] === true) {
        return {
          jobIdExists: {
            valid: false,
            message: jobExistsErrorMessage,
          },
        };
      }
      return {
        jobIdExists: {
          valid: true,
        },
      };
    })
  );
}

export function groupIdsValidator(jobCreator$: Subject<JobCreator>): Observable<GroupsExistResult> {
  return jobCreator$.pipe(
    map((jobCreator) => {
      return {
        jobCreator,
        groups: jobCreator.groups,
      };
    }),
    // No need to perform an API call if the analysis configuration hasn't been changed
    distinctUntilChanged((prev, curr) => {
      return JSON.stringify(prev.groups) === JSON.stringify(curr.groups);
    }),
    switchMap(({ groups }) => {
      return ml.jobs.jobsExist$(groups, true);
    }),
    map((jobExistsResults) => {
      const groups = Object.values(jobExistsResults);
      if (groups.some((g) => g === true)) {
        return {
          groupIdsExist: {
            valid: false,
            message: groupExistsErrorMessage,
          },
        };
      }
      return {
        groupIdsExist: {
          valid: true,
        },
      };
    })
  );
}
