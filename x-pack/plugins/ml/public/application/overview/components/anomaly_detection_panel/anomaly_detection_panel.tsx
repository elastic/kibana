/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, Fragment, useEffect, useMemo, useState } from 'react';
import {
  EuiButton,
  EuiCallOut,
  EuiEmptyPrompt,
  EuiImage,
  EuiLoadingSpinner,
  EuiPanel,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { zipObject } from 'lodash';
import {
  useMlKibana,
  useMlLocator,
  useNavigateToPath,
  useTimefilter,
} from '../../../contexts/kibana';
import { AnomalyDetectionTable } from './table';
import { ml } from '../../../services/ml_api_service';
import { getGroupsFromJobs, getStatsBarData } from './utils';
import { Dictionary } from '../../../../../common/types/common';
import { MlSummaryJob, MlSummaryJobs } from '../../../../../common/types/anomaly_detection_jobs';
import { ML_PAGES } from '../../../../../common/constants/locator';
import adImage from './ml_anomaly_detection.png';
import { useRefresh } from '../../../routing/use_refresh';
import { useToastNotificationService } from '../../../services/toast_notification_service';
import { AnomalyTimelineService } from '../../../services/anomaly_timeline_service';
import { mlResultsServiceProvider } from '../../../services/results_service';
import type { OverallSwimlaneData } from '../../../explorer/explorer_utils';
import { JobStatsBarStats } from '../../../components/stats_bar';

export type GroupsDictionary = Dictionary<Group>;

export interface Group {
  id: string;
  jobs: MlSummaryJob[];
  jobIds: string[];
  docs_processed: number;
  earliest_timestamp?: number;
  latest_timestamp?: number;
  max_anomaly_score: number | undefined | null;
  jobs_in_group: number;
  overallSwimLane?: OverallSwimlaneData;
}

interface Props {
  jobCreationDisabled: boolean;
  setLazyJobCount: React.Dispatch<React.SetStateAction<number>>;
}

export const AnomalyDetectionPanel: FC<Props> = ({ jobCreationDisabled, setLazyJobCount }) => {
  const {
    services: {
      uiSettings,
      mlServices: { mlApiServices },
    },
  } = useMlKibana();
  const mlLocator = useMlLocator();
  const navigateToPath = useNavigateToPath();

  const { displayErrorToast } = useToastNotificationService();

  const timefilter = useTimefilter();

  const anomalyTimelineService = useMemo(
    () =>
      new AnomalyTimelineService(timefilter, uiSettings, mlResultsServiceProvider(mlApiServices)),
    [timefilter, uiSettings, mlApiServices]
  );

  const refresh = useRefresh();

  const redirectToCreateJobSelectIndexPage = async () => {
    if (!mlLocator) return;
    const path = await mlLocator.getUrl({
      page: ML_PAGES.ANOMALY_DETECTION_CREATE_JOB_SELECT_INDEX,
    });
    await navigateToPath(path, true);
  };

  const [isLoading, setIsLoading] = useState(false);
  const [groups, setGroups] = useState<GroupsDictionary>({});
  const [groupsCount, setGroupsCount] = useState<number>(0);
  const [statsBarData, setStatsBarData] = useState<JobStatsBarStats>();
  const [errorMessage, setErrorMessage] = useState<string>();

  const loadJobs = async () => {
    setIsLoading(true);

    let lazyJobCount = 0;
    try {
      const jobsResult: MlSummaryJobs = await ml.jobs.jobsSummary([]);
      const jobsSummaryList = jobsResult.map((job: MlSummaryJob) => {
        job.latestTimestampSortValue = job.latestTimestampMs || 0;
        if (job.awaitingNodeAssignment) {
          lazyJobCount++;
        }
        return job;
      });
      const { groups: jobsGroups, count } = getGroupsFromJobs(jobsSummaryList);
      const stats = getStatsBarData(jobsSummaryList);
      setIsLoading(false);
      setErrorMessage(undefined);
      setStatsBarData(stats);
      setGroupsCount(count);
      setGroups(jobsGroups);
      loadOverallSwimLanes(jobsGroups);
      setLazyJobCount(lazyJobCount);
    } catch (e) {
      setErrorMessage(e.message !== undefined ? e.message : JSON.stringify(e));
      setIsLoading(false);
    }
  };

  const loadOverallSwimLanes = async (groupsObject: GroupsDictionary) => {
    try {
      // Extract non-empty groups first
      const nonEmptyGroups = Object.fromEntries(
        Object.entries(groupsObject)
          .filter(([groupId, group]) => group.jobs.length > 0)
          .map(([groupId, group]) => {
            return [groupId, anomalyTimelineService.loadOverallData(group.jobs, 300)];
          })
      );

      const groupsOverallScoreData = zipObject(
        Object.keys(nonEmptyGroups),
        await Promise.all(Object.values(nonEmptyGroups))
      );

      const tempGroups = { ...groupsObject };

      for (const groupId in tempGroups) {
        if (tempGroups.hasOwnProperty(groupId)) {
          tempGroups[groupId].overallSwimLane = groupsOverallScoreData[groupId];
        }
      }

      setGroups(tempGroups);
    } catch (e) {
      displayErrorToast(
        e,
        i18n.translate('xpack.ml.overview.anomalyDetection.errorWithFetchingSwimLanesData', {
          defaultMessage: 'An error occurred fetching anomaly results',
        })
      );
    }
  };

  useEffect(() => {
    loadJobs();
  }, [refresh?.timeRange]);

  const errorDisplay = (
    <Fragment>
      <EuiCallOut
        title={i18n.translate('xpack.ml.overview.anomalyDetection.errorPromptTitle', {
          defaultMessage: 'An error occurred getting the anomaly detection jobs list.',
        })}
        color="danger"
        iconType="alert"
      >
        <pre>{errorMessage}</pre>
      </EuiCallOut>
    </Fragment>
  );

  const panelClass = isLoading ? 'mlOverviewPanel__isLoading' : 'mlOverviewPanel';

  const noAdJobs =
    !errorMessage &&
    isLoading === false &&
    typeof errorMessage === 'undefined' &&
    groupsCount === 0;

  if (noAdJobs) {
    return (
      <EuiEmptyPrompt
        layout="horizontal"
        hasBorder={true}
        hasShadow={false}
        icon={<EuiImage size="fullWidth" src={adImage} alt="anomaly_detection" />}
        color="plain"
        title={
          <h2>
            {i18n.translate('xpack.ml.overview.anomalyDetection.createFirstJobMessage', {
              defaultMessage: 'Create your first anomaly detection job',
            })}
          </h2>
        }
        body={
          <>
            <p>
              {i18n.translate('xpack.ml.overview.anomalyDetection.emptyPromptText', {
                defaultMessage: `Anomaly detection enables you to find unusual behavior in time series data. Start automatically spotting the anomalies hiding in your data and resolve issues faster.`,
              })}
            </p>
          </>
        }
        actions={
          <EuiButton
            color="primary"
            onClick={redirectToCreateJobSelectIndexPage}
            fill
            isDisabled={jobCreationDisabled}
            data-test-subj="mlOverviewCreateADJobButton"
          >
            {i18n.translate('xpack.ml.overview.anomalyDetection.createJobButtonText', {
              defaultMessage: 'Create job',
            })}
          </EuiButton>
        }
      />
    );
  }

  return (
    <EuiPanel className={panelClass} hasShadow={false} hasBorder>
      {typeof errorMessage !== 'undefined' && errorDisplay}
      {isLoading && <EuiLoadingSpinner className="mlOverviewPanel__spinner" size="xl" />}

      {isLoading === false && typeof errorMessage === 'undefined' && groupsCount > 0 ? (
        <AnomalyDetectionTable items={groups} statsBarData={statsBarData!} />
      ) : null}
    </EuiPanel>
  );
};
