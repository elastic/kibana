/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useEffect, Fragment } from 'react';
import {
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiPageContentHeader,
  EuiPageContentHeaderSection,
  EuiTitle,
  EuiPageContentBody,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { Wizard } from './wizard';
import { WIZARD_STEPS } from '../components/step_types';
import { getJobCreatorTitle } from '../../common/job_creator/util/general';
import { useMlKibana } from '../../../../contexts/kibana';
import {
  jobCreatorFactory,
  isAdvancedJobCreator,
  isCategorizationJobCreator,
} from '../../common/job_creator';
import {
  JOB_TYPE,
  DEFAULT_MODEL_MEMORY_LIMIT,
  DEFAULT_BUCKET_SPAN,
} from '../../../../../../common/constants/new_job';
import { ChartLoader } from '../../common/chart_loader';
import { ResultsLoader } from '../../common/results_loader';
import { JobValidator } from '../../common/job_validator';
import { useMlContext } from '../../../../contexts/ml';
import { getTimeFilterRange } from '../../../../components/full_time_range_selector';
import { getTimeBucketsFromCache } from '../../../../util/time_buckets';
import { ExistingJobsAndGroups, mlJobService } from '../../../../services/job_service';
import { expandCombinedJobConfig } from '../../../../../../common/types/anomaly_detection_jobs';
import { newJobCapsService } from '../../../../services/new_job_capabilities_service';
import { EVENT_RATE_FIELD_ID } from '../../../../../../common/types/fields';
import { getNewJobDefaults } from '../../../../services/ml_server_info';

const PAGE_WIDTH = 1200; // document.querySelector('.single-metric-job-container').width();
const BAR_TARGET = PAGE_WIDTH > 2000 ? 1000 : PAGE_WIDTH / 2;
const MAX_BARS = BAR_TARGET + (BAR_TARGET / 100) * 100; // 100% larger than bar target

export interface PageProps {
  existingJobsAndGroups: ExistingJobsAndGroups;
  jobType: JOB_TYPE;
}

export const Page: FC<PageProps> = ({ existingJobsAndGroups, jobType }) => {
  const {
    services: { notifications },
  } = useMlKibana();
  const mlContext = useMlContext();
  const jobCreator = jobCreatorFactory(jobType)(
    mlContext.currentIndexPattern,
    mlContext.currentSavedSearch,
    mlContext.combinedQuery
  );

  const { from, to } = getTimeFilterRange();
  jobCreator.setTimeRange(from, to);

  let firstWizardStep =
    jobType === JOB_TYPE.ADVANCED
      ? WIZARD_STEPS.ADVANCED_CONFIGURE_DATAFEED
      : WIZARD_STEPS.TIME_RANGE;

  let autoSetTimeRange = false;

  if (mlJobService.tempJobCloningObjects.job !== undefined) {
    // cloning a job
    const clonedJob = mlJobService.cloneJob(mlJobService.tempJobCloningObjects.job);
    const { job, datafeed } = expandCombinedJobConfig(clonedJob);
    initCategorizationSettings();
    jobCreator.cloneFromExistingJob(job, datafeed);

    // if we're not skipping the time range, this is a standard job clone, so wipe the jobId
    if (mlJobService.tempJobCloningObjects.skipTimeRangeStep === false) {
      jobCreator.jobId = '';
    } else if (jobType !== JOB_TYPE.ADVANCED) {
      firstWizardStep = WIZARD_STEPS.PICK_FIELDS;
    }

    mlJobService.tempJobCloningObjects.skipTimeRangeStep = false;
    mlJobService.tempJobCloningObjects.job = undefined;

    if (
      mlJobService.tempJobCloningObjects.start !== undefined &&
      mlJobService.tempJobCloningObjects.end !== undefined
    ) {
      // auto select the start and end dates for the time range picker
      jobCreator.setTimeRange(
        mlJobService.tempJobCloningObjects.start,
        mlJobService.tempJobCloningObjects.end
      );
      mlJobService.tempJobCloningObjects.start = undefined;
      mlJobService.tempJobCloningObjects.end = undefined;
    } else {
      // if not start and end times are set and this is an advanced job,
      // auto set the time range based on the index
      autoSetTimeRange = isAdvancedJobCreator(jobCreator);
    }

    if (mlJobService.tempJobCloningObjects.calendars) {
      jobCreator.calendars = mlJobService.tempJobCloningObjects.calendars;
      mlJobService.tempJobCloningObjects.calendars = undefined;
    }
  } else {
    // creating a new job
    jobCreator.bucketSpan = DEFAULT_BUCKET_SPAN;

    if (
      jobCreator.type !== JOB_TYPE.POPULATION &&
      jobCreator.type !== JOB_TYPE.ADVANCED &&
      jobCreator.type !== JOB_TYPE.CATEGORIZATION
    ) {
      // for all other than population or advanced, use 10MB
      jobCreator.modelMemoryLimit = DEFAULT_MODEL_MEMORY_LIMIT;
    }

    if (jobCreator.type === JOB_TYPE.SINGLE_METRIC) {
      jobCreator.modelPlot = true;
      jobCreator.modelChangeAnnotations = true;
    }

    if (mlContext.currentSavedSearch !== null) {
      // Jobs created from saved searches cannot be cloned in the wizard as the
      // ML job config holds no reference to the saved search ID.
      jobCreator.createdBy = null;
    }

    // auto set the time range if creating a new advanced job
    autoSetTimeRange = isAdvancedJobCreator(jobCreator);
    initCategorizationSettings();
    if (isCategorizationJobCreator(jobCreator)) {
      const { catFields } = newJobCapsService;
      if (catFields.length === 1) {
        jobCreator.categorizationFieldName = catFields[0].name;
      }
    }
  }

  if (autoSetTimeRange && isAdvancedJobCreator(jobCreator)) {
    // for advanced jobs, load the full time range start and end times
    // so they can be used for job validation and bucket span estimation
    try {
      jobCreator.autoSetTimeRange();
    } catch (error) {
      const { toasts } = notifications;
      toasts.addDanger({
        title: i18n.translate('xpack.ml.newJob.wizard.autoSetJobCreatorTimeRange.error', {
          defaultMessage: `Error retrieving beginning and end times of index`,
        }),
        text: error,
      });
    }
  }

  function initCategorizationSettings() {
    if (isCategorizationJobCreator(jobCreator)) {
      // categorization job will always use a count agg, so give it
      // to the job creator now
      const count = newJobCapsService.getAggById('count');
      const rare = newJobCapsService.getAggById('rare');
      const eventRate = newJobCapsService.getFieldById(EVENT_RATE_FIELD_ID);
      jobCreator.setDefaultDetectorProperties(count, rare, eventRate);

      const { anomaly_detectors: anomalyDetectors } = getNewJobDefaults();
      jobCreator.categorizationAnalyzer = anomalyDetectors.categorization_analyzer!;
    }
  }

  const chartInterval = getTimeBucketsFromCache();
  chartInterval.setBarTarget(BAR_TARGET);
  chartInterval.setMaxBars(MAX_BARS);
  chartInterval.setInterval('auto');

  const chartLoader = new ChartLoader(mlContext.currentIndexPattern, mlContext.combinedQuery);

  const jobValidator = new JobValidator(jobCreator, existingJobsAndGroups);

  const resultsLoader = new ResultsLoader(jobCreator, chartInterval, chartLoader);

  useEffect(() => {
    return () => {
      jobCreator.forceStopRefreshPolls();
    };
  });

  const jobCreatorTitle = getJobCreatorTitle(jobCreator);

  return (
    <Fragment>
      <EuiPage style={{ backgroundColor: 'inherit' }} data-test-subj={`mlPageJobWizard ${jobType}`}>
        <EuiPageBody>
          <EuiPageContent>
            <EuiPageContentHeader>
              <EuiPageContentHeaderSection>
                <EuiTitle>
                  <h1>
                    <FormattedMessage
                      id="xpack.ml.newJob.page.createJob"
                      defaultMessage="Create job"
                    />
                    : {jobCreatorTitle}
                  </h1>
                </EuiTitle>
              </EuiPageContentHeaderSection>
            </EuiPageContentHeader>

            <EuiPageContentBody>
              <Wizard
                jobCreator={jobCreator}
                chartLoader={chartLoader}
                resultsLoader={resultsLoader}
                chartInterval={chartInterval}
                jobValidator={jobValidator}
                existingJobsAndGroups={existingJobsAndGroups}
                firstWizardStep={firstWizardStep}
              />
            </EuiPageContentBody>
          </EuiPageContent>
        </EuiPageBody>
      </EuiPage>
    </Fragment>
  );
};
