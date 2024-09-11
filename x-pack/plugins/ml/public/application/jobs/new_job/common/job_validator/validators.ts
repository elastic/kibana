/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { distinctUntilChanged, filter, map, pluck, switchMap, startWith } from 'rxjs';
import type { Observable, Subject } from 'rxjs';
import { combineLatest } from 'rxjs';
import type {
  CardinalityModelPlotHigh,
  CardinalityValidationResult,
} from '../../../../services/ml_api_service';
import type { JobCreator } from '../job_creator';
import type { CombinedJob } from '../../../../../../common/types/anomaly_detection_jobs';
import type { BasicValidations } from './job_validator';

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
        return jobCreator.mlApiServices
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
    // No need to perform an API call if the analysis configuration hasn't been changed
    distinctUntilChanged(
      (prevJobCreator, currJobCreator) => prevJobCreator.jobId === currJobCreator.jobId
    ),
    switchMap((jobCreator) => jobCreator.mlApiServices.jobs.jobsExist$([jobCreator.jobId], true)),
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
    // No need to perform an API call if the analysis configuration hasn't been changed
    distinctUntilChanged(
      (prevJobCreator, currJobCreator) =>
        JSON.stringify(prevJobCreator.groups) === JSON.stringify(currJobCreator.groups)
    ),
    switchMap((jobCreator) => {
      return jobCreator.mlApiServices.jobs.jobsExist$(jobCreator.groups, true);
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
