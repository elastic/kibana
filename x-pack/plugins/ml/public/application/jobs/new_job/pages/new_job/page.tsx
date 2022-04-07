/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useEffect, Fragment, useMemo } from 'react';
import { EuiPageContentHeader, EuiPageContentHeaderSection } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { Wizard } from './wizard';
import { WIZARD_STEPS } from '../components/step_types';
import { getJobCreatorTitle } from '../../common/job_creator/util/general';
import {
  jobCreatorFactory,
  isAdvancedJobCreator,
  isCategorizationJobCreator,
  isRareJobCreator,
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
import { newJobCapsService } from '../../../../services/new_job_capabilities/new_job_capabilities_service';
import { EVENT_RATE_FIELD_ID } from '../../../../../../common/types/fields';
import { getNewJobDefaults } from '../../../../services/ml_server_info';
import { useToastNotificationService } from '../../../../services/toast_notification_service';
import { MlPageHeader } from '../../../../components/page_header';

const PAGE_WIDTH = 1200; // document.querySelector('.single-metric-job-container').width();
const BAR_TARGET = PAGE_WIDTH > 2000 ? 1000 : PAGE_WIDTH / 2;
const MAX_BARS = BAR_TARGET + (BAR_TARGET / 100) * 100; // 100% larger than bar target

export interface PageProps {
  existingJobsAndGroups: ExistingJobsAndGroups;
  jobType: JOB_TYPE;
}

export const Page: FC<PageProps> = ({ existingJobsAndGroups, jobType }) => {
  const mlContext = useMlContext();
  const jobCreator = useMemo(
    () =>
      jobCreatorFactory(jobType)(
        mlContext.currentDataView,
        mlContext.currentSavedSearch,
        mlContext.combinedQuery
      ),
    [jobType]
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

  const chartLoader = useMemo(
    () => new ChartLoader(mlContext.currentDataView, jobCreator.query),
    []
  );

  const jobValidator = useMemo(() => new JobValidator(jobCreator), [jobCreator]);

  const resultsLoader = useMemo(
    () => new ResultsLoader(jobCreator, chartInterval, chartLoader),
    []
  );

  useEffect(() => {
    return () => {
      jobCreator.forceStopRefreshPolls();
    };
  });

  const jobCreatorTitle = getJobCreatorTitle(jobCreator);

  return (
    <Fragment>
      <MlPageHeader>
        <FormattedMessage id="xpack.ml.newJob.page.createJob" defaultMessage="Create job" />:{' '}
        {jobCreatorTitle}
      </MlPageHeader>

      <div style={{ backgroundColor: 'inherit' }} data-test-subj={`mlPageJobWizard ${jobType}`}>
        <EuiPageContentHeader>
          <EuiPageContentHeaderSection>
            <FormattedMessage
              id="xpack.ml.newJob.page.createJob.dataViewName"
              defaultMessage="Using data view {dataViewName}"
              values={{ dataViewName: jobCreator.indexPatternTitle }}
            />
          </EuiPageContentHeaderSection>
        </EuiPageContentHeader>

        <Wizard
          jobCreator={jobCreator}
          chartLoader={chartLoader}
          resultsLoader={resultsLoader}
          chartInterval={chartInterval}
          jobValidator={jobValidator}
          existingJobsAndGroups={existingJobsAndGroups}
          firstWizardStep={firstWizardStep}
        />
      </div>
    </Fragment>
  );
};
