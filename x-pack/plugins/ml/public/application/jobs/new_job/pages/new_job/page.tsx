/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiPageContentBody,
  EuiPageContentHeader,
  EuiPageContentHeaderSection,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import type { FC } from 'react';
import React, { Fragment, useEffect } from 'react';
import {
  DEFAULT_BUCKET_SPAN,
  DEFAULT_MODEL_MEMORY_LIMIT,
  JOB_TYPE,
} from '../../../../../../common/constants/new_job';
import { EVENT_RATE_FIELD_ID } from '../../../../../../common/types/fields';
import { getTimeFilterRange } from '../../../../components/full_time_range_selector/full_time_range_selector_service';
import { useMlContext } from '../../../../contexts/ml/use_ml_context';
import type { ExistingJobsAndGroups } from '../../../../services/job_service';
import { mlJobService } from '../../../../services/job_service';
import { getNewJobDefaults } from '../../../../services/ml_server_info';
import { newJobCapsService } from '../../../../services/new_job_capabilities/new_job_capabilities_service';
import { useToastNotificationService } from '../../../../services/toast_notification_service/toast_notification_service';
import { getTimeBucketsFromCache } from '../../../../util/time_buckets';
import { ChartLoader } from '../../common/chart_loader/chart_loader';
import { jobCreatorFactory } from '../../common/job_creator/job_creator_factory';
import {
  isAdvancedJobCreator,
  isCategorizationJobCreator,
  isRareJobCreator,
} from '../../common/job_creator/type_guards';
import { getJobCreatorTitle } from '../../common/job_creator/util/general';
import { JobValidator } from '../../common/job_validator/job_validator';
import { ResultsLoader } from '../../common/results_loader/results_loader';
import { WIZARD_STEPS } from '../components/step_types';
import { Wizard } from './wizard';

const PAGE_WIDTH = 1200; // document.querySelector('.single-metric-job-container').width();
const BAR_TARGET = PAGE_WIDTH > 2000 ? 1000 : PAGE_WIDTH / 2;
const MAX_BARS = BAR_TARGET + (BAR_TARGET / 100) * 100; // 100% larger than bar target

export interface PageProps {
  existingJobsAndGroups: ExistingJobsAndGroups;
  jobType: JOB_TYPE;
}

export const Page: FC<PageProps> = ({ existingJobsAndGroups, jobType }) => {
  const mlContext = useMlContext();
  const jobCreator = jobCreatorFactory(jobType)(
    mlContext.currentIndexPattern,
    mlContext.currentSavedSearch,
    mlContext.combinedQuery
  );
  const { displayErrorToast } = useToastNotificationService();

  const { from, to } = getTimeFilterRange();
  jobCreator.setTimeRange(from, to);

  let firstWizardStep =
    jobType === JOB_TYPE.ADVANCED
      ? WIZARD_STEPS.ADVANCED_CONFIGURE_DATAFEED
      : WIZARD_STEPS.TIME_RANGE;

  let autoSetTimeRange = false;

  if (
    mlJobService.tempJobCloningObjects.job !== undefined &&
    mlJobService.tempJobCloningObjects.datafeed !== undefined
  ) {
    // cloning a job
    const clonedJob = mlJobService.tempJobCloningObjects.job;
    const clonedDatafeed = mlJobService.cloneDatafeed(mlJobService.tempJobCloningObjects.datafeed);

    initCategorizationSettings();
    jobCreator.cloneFromExistingJob(clonedJob, clonedDatafeed);

    // if we're not skipping the time range, this is a standard job clone, so wipe the jobId
    if (mlJobService.tempJobCloningObjects.skipTimeRangeStep === false) {
      jobCreator.jobId = '';
    } else if (jobType !== JOB_TYPE.ADVANCED) {
      firstWizardStep = WIZARD_STEPS.PICK_FIELDS;
    }

    mlJobService.tempJobCloningObjects.skipTimeRangeStep = false;
    mlJobService.tempJobCloningObjects.job = undefined;
    mlJobService.tempJobCloningObjects.datafeed = undefined;
    mlJobService.tempJobCloningObjects.createdBy = undefined;

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
    jobCreator.autoSetTimeRange().catch((error) => {
      const title = i18n.translate('xpack.ml.newJob.wizard.autoSetJobCreatorTimeRange.error', {
        defaultMessage: `Error retrieving beginning and end times of index`,
      });
      displayErrorToast(error, title);
    });
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
    } else if (isRareJobCreator(jobCreator)) {
      const rare = newJobCapsService.getAggById('rare');
      const freqRare = newJobCapsService.getAggById('freq_rare');
      jobCreator.setDefaultDetectorProperties(rare, freqRare);
    }
  }

  const chartInterval = getTimeBucketsFromCache();
  chartInterval.setBarTarget(BAR_TARGET);
  chartInterval.setMaxBars(MAX_BARS);
  chartInterval.setInterval('auto');

  const chartLoader = new ChartLoader(mlContext.currentIndexPattern, mlContext.combinedQuery);

  const jobValidator = new JobValidator(jobCreator);

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

                <FormattedMessage
                  id="xpack.ml.newJob.page.createJob.indexPatternTitle"
                  defaultMessage="Using index pattern {index}"
                  values={{ index: jobCreator.indexPatternTitle }}
                />
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
