/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { Fragment, useEffect, useState } from 'react';
import { EuiCallOut, EuiLink, EuiLoadingSpinner } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { zipObject, groupBy } from 'lodash';
import { FormattedMessage } from '@kbn/i18n-react';
import { useStorage } from '@kbn/ml-local-storage';
import type { MlStorageKey, TMlStorageMapped } from '../../../../../common/types/storage';
import { ML_OVERVIEW_PANELS } from '../../../../../common/types/storage';
import { ML_PAGES } from '../../../../../common/constants/locator';
import { OverviewStatsBar } from '../../../components/collapsible_panel/collapsible_panel';
import { CollapsiblePanel } from '../../../components/collapsible_panel';
import { useMlApi, useMlKibana, useMlLink } from '../../../contexts/kibana';
import { AnomalyDetectionTable } from './table';
import { getGroupsFromJobs, getStatsBarData } from './utils';
import type { Dictionary } from '../../../../../common/types/common';
import type {
  MlSummaryJob,
  MlSummaryJobs,
} from '../../../../../common/types/anomaly_detection_jobs';
import { useRefresh } from '../../../routing/use_refresh';
import { useToastNotificationService } from '../../../services/toast_notification_service';
import type { AnomalyTimelineService } from '../../../services/anomaly_timeline_service';
import type { OverallSwimlaneData } from '../../../explorer/explorer_utils';
import { AnomalyDetectionEmptyState } from '../../../jobs/jobs_list/components/anomaly_detection_empty_state';
import { overviewPanelDefaultState } from '../../overview_page';
import { useEnabledFeatures } from '../../../contexts/ml';

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
  anomalyTimelineService: AnomalyTimelineService;
  setLazyJobCount: React.Dispatch<React.SetStateAction<number>>;
}

export const AnomalyDetectionPanel: FC<Props> = ({ anomalyTimelineService, setLazyJobCount }) => {
  const {
    services: { charts: chartsService },
  } = useMlKibana();
  const mlApi = useMlApi();

  const { displayErrorToast } = useToastNotificationService();
  const { showNodeInfo } = useEnabledFeatures();

  const refresh = useRefresh();

  const [panelsState, setPanelsState] = useStorage<
    MlStorageKey,
    TMlStorageMapped<typeof ML_OVERVIEW_PANELS>
  >(ML_OVERVIEW_PANELS, overviewPanelDefaultState);

  const manageJobsLink = useMlLink({
    page: ML_PAGES.ANOMALY_DETECTION_JOBS_MANAGE,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [groups, setGroups] = useState<GroupsDictionary>({});
  const [groupsCount, setGroupsCount] = useState<number>(0);
  const [statsBarData, setStatsBarData] = useState<Array<{ label: string; value: number }>>();
  const [restStatsBarData, setRestStatsBarData] =
    useState<Array<{ label: string; value: number }>>();
  const [errorMessage, setErrorMessage] = useState<string>();

  const loadJobs = async () => {
    setIsLoading(true);

    let lazyJobCount = 0;
    try {
      const jobsResult: MlSummaryJobs = await mlApi.jobs.jobsSummary([]);
      const jobsSummaryList = jobsResult.map((job: MlSummaryJob) => {
        job.latestTimestampSortValue = job.latestTimestampMs || 0;
        if (job.awaitingNodeAssignment) {
          lazyJobCount++;
        }
        return job;
      });
      const { groups: jobsGroups, count } = getGroupsFromJobs(jobsSummaryList);
      const stats = getStatsBarData(jobsSummaryList, showNodeInfo);

      const statGroups = groupBy(
        Object.entries(stats)
          .filter(([k, v]) => v.show)
          .map(([k, v]) => v),
        'group'
      );

      setIsLoading(false);
      setErrorMessage(undefined);

      setStatsBarData(statGroups[0]);
      setRestStatsBarData(statGroups[1]);

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
        if (Object.hasOwn(tempGroups, groupId)) {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refresh?.timeRange]);

  const errorDisplay = (
    <Fragment>
      <EuiCallOut
        title={i18n.translate('xpack.ml.overview.anomalyDetection.errorPromptTitle', {
          defaultMessage: 'An error occurred getting the anomaly detection jobs list.',
        })}
        color="danger"
        iconType="warning"
      >
        <pre>{errorMessage}</pre>
      </EuiCallOut>
    </Fragment>
  );

  const noAdJobs =
    !errorMessage &&
    isLoading === false &&
    typeof errorMessage === 'undefined' &&
    groupsCount === 0;

  return (
    <CollapsiblePanel
      isOpen={panelsState.adJobs}
      onToggle={(update) => {
        setPanelsState({ ...panelsState, adJobs: update });
      }}
      header={
        <FormattedMessage
          id="xpack.ml.overview.adJobsPanel.header"
          defaultMessage="Anomaly Detection Jobs"
        />
      }
      headerItems={[
        ...(statsBarData
          ? [<OverviewStatsBar inputStats={statsBarData} dataTestSub={'mlOverviewJobStatsBar'} />]
          : []),
        ...(restStatsBarData
          ? [
              <OverviewStatsBar
                inputStats={restStatsBarData}
                dataTestSub={'mlOverviewJobStatsBarExtra'}
              />,
            ]
          : []),
        <EuiLink href={manageJobsLink}>
          {i18n.translate('xpack.ml.overview.anomalyDetection.manageJobsButtonText', {
            defaultMessage: 'Manage jobs',
          })}
        </EuiLink>,
      ]}
    >
      {noAdJobs ? <AnomalyDetectionEmptyState /> : null}

      {typeof errorMessage !== 'undefined' && errorDisplay}

      {isLoading ? <EuiLoadingSpinner className="mlOverviewPanel__spinner" size="xl" /> : null}

      {isLoading === false && typeof errorMessage === 'undefined' && groupsCount > 0 ? (
        <AnomalyDetectionTable items={groups} chartsService={chartsService} />
      ) : null}
    </CollapsiblePanel>
  );
};
