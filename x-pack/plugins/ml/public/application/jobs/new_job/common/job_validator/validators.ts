/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { distinctUntilChanged, filter, map, pluck, switchMap, startWith } from 'rxjs/operators';
import { combineLatest, Observable, Subject } from 'rxjs';
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
  'xpack.ml.newJob.wizard.validateJob.asyncJobNameAlreadyExists',
  {
    defaultMessage:
      'Job ID already exists. A job ID cannot be the same as an existing job or group.',
  }
);
const groupExistsErrorMessage = i18n.translate(
  'xpack.ml.newJob.wizard.validateJob.asyncGroupNameAlreadyExists',
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
  return combineLatest([
    jobCreator$.pipe(pluck('modelPlot')),
    jobCreator$.pipe(
      filter((jobCreator) => {
        return jobCreator?.modelPlot;
      }),
      map((jobCreator) => {
        return {
          jobCreator,
          analysisConfigString: JSON.stringify(jobCreator.jobConfig.analysis_config, null, 2),
        };
      }),
      distinctUntilChanged((prev, curr) => {
        return prev.analysisConfigString === curr.analysisConfigString;
      }),
      switchMap(({ jobCreator }) => {
        // Perform a cardinality check only with enabled model plot.
        return ml
          .validateCardinality$({
            ...jobCreator.jobConfig,
            datafeed_config: jobCreator.datafeedConfig,
          } as CombinedJob)
          .pipe(
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
      }),
      startWith(null)
    ),
  ]).pipe(
    map(([isModelPlotEnabled, cardinalityValidationResult]) => {
      return isModelPlotEnabled ? cardinalityValidationResult : null;
    })
  );
}

export function jobIdValidator(jobCreator$: Subject<JobCreator>): Observable<JobExistsResult> {
  return jobCreator$.pipe(
    map((jobCreator) => {
      return jobCreator.jobId;
    }),
    // No need to perform an API call if the analysis configuration hasn't been changed
    distinctUntilChanged((prevJobId, currJobId) => prevJobId === currJobId),
    switchMap((jobId) => ml.jobs.jobsExist$([jobId], true)),
    map((jobExistsResults) => {
      const jobs = Object.values(jobExistsResults);
      const valid = jobs?.[0].exists === false;
      return {
        jobIdExists: {
          valid,
          ...(valid ? {} : { message: jobExistsErrorMessage }),
        },
      };
    })
  );
}

export function groupIdsValidator(jobCreator$: Subject<JobCreator>): Observable<GroupsExistResult> {
  return jobCreator$.pipe(
    map((jobCreator) => jobCreator.groups),
    // No need to perform an API call if the analysis configuration hasn't been changed
    distinctUntilChanged(
      (prevGroups, currGroups) => JSON.stringify(prevGroups) === JSON.stringify(currGroups)
    ),
    switchMap((groups) => {
      return ml.jobs.jobsExist$(groups, true);
    }),
    map((jobExistsResults) => {
      const groups = Object.values(jobExistsResults);
      // only match jobs that exist but aren't groups.
      // as we should allow existing groups to be reused.
      const valid = groups.some((g) => g.exists === true && g.isGroup === false) === false;
      return {
        groupIdsExist: {
          valid,
          ...(valid ? {} : { message: groupExistsErrorMessage }),
        },
      };
    })
  );
}
