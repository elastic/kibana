/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isPopulatedObject } from '@kbn/ml-is-populated-object';
import type { JobCreator } from '../jobs/new_job/common/job_creator/job_creator';

interface TempJobCloningObjects {
  createdBy: any;
  datafeed: any;
  job: any;
  skipTimeRangeStep: boolean;
  start?: any;
  end?: any;
  calendars: any;
  autoSetTimeRange?: boolean;
}

export class JobCloningService {
  // tempJobCloningObjects -> used to pass a job object between the job management page and
  // and the advanced wizard.
  // if populated when loading the advanced wizard, the job is used for cloning.
  // if populated when loading the job management page, the start datafeed modal
  // is automatically opened.
  private tempJobCloningObjects: TempJobCloningObjects = {
    createdBy: undefined,
    datafeed: undefined,
    job: undefined,
    skipTimeRangeStep: false,
    start: undefined,
    end: undefined,
    calendars: undefined,
    autoSetTimeRange: false,
  };

  public getJobCloningObjects(): Readonly<TempJobCloningObjects> {
    return this.tempJobCloningObjects;
  }

  clearJobCloningObjects() {
    this.tempJobCloningObjects = {
      createdBy: undefined,
      datafeed: undefined,
      job: undefined,
      skipTimeRangeStep: false,
      start: undefined,
      end: undefined,
      calendars: undefined,
      autoSetTimeRange: false,
    };
  }

  stashJobForCloning(
    jobCreator: JobCreator,
    skipTimeRangeStep: boolean,
    includeTimeRange: boolean,
    autoSetTimeRange: boolean = false
  ) {
    const tempJobCloningObjects: TempJobCloningObjects = {
      job: jobCreator.jobConfig,
      datafeed: jobCreator.datafeedConfig,
      createdBy: jobCreator.createdBy ?? undefined,
      // skip over the time picker step of the wizard
      skipTimeRangeStep,
      calendars: jobCreator.calendars,
      ...(includeTimeRange === true && autoSetTimeRange === false
        ? // auto select the start and end dates of the time picker
          {
            start: jobCreator.start,
            end: jobCreator.end,
          }
        : { autoSetTimeRange: true }),
    };

    this.tempJobCloningObjects = tempJobCloningObjects;
  }

  public checkForAutoStartDatafeed() {
    const job = this.tempJobCloningObjects.job;
    const datafeed = this.tempJobCloningObjects.datafeed;
    if (job !== undefined) {
      this.tempJobCloningObjects.job = undefined;
      this.tempJobCloningObjects.datafeed = undefined;
      this.tempJobCloningObjects.createdBy = undefined;

      const hasDatafeed = isPopulatedObject(datafeed);
      const datafeedId = hasDatafeed ? datafeed.datafeed_id : '';
      return {
        id: job.job_id,
        hasDatafeed,
        latestTimestampSortValue: 0,
        datafeedId,
      };
    }
  }

  public stashJobCloningObjects(config: TempJobCloningObjects) {
    this.tempJobCloningObjects = config;
  }

  public get createdBy() {
    return this.tempJobCloningObjects.createdBy;
  }
  public get datafeed() {
    return this.tempJobCloningObjects.datafeed;
  }
  public get job() {
    return this.tempJobCloningObjects.job;
  }
  public get skipTimeRangeStep() {
    return this.tempJobCloningObjects.skipTimeRangeStep;
  }
  public get start() {
    return this.tempJobCloningObjects.start;
  }
  public get end() {
    return this.tempJobCloningObjects.end;
  }
  public get calendars() {
    return this.tempJobCloningObjects.calendars;
  }
  public get autoSetTimeRange() {
    return this.tempJobCloningObjects.autoSetTimeRange;
  }
}

export const jobCloningService = new JobCloningService();
