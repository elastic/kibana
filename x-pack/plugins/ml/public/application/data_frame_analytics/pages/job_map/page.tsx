/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useState, useEffect, useCallback } from 'react';
import { EuiEmptyPrompt } from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n-react';
import { useUrlState } from '@kbn/ml-url-state';
import { NodeAvailableWarning } from '../../../components/node_available_warning';
import { SavedObjectsWarning } from '../../../components/saved_objects_warning';
import { UpgradeWarning } from '../../../components/upgrade';
import { JobMap } from '.';
import { HelpMenu } from '../../../components/help_menu';
import { useMlKibana, useMlApiContext } from '../../../contexts/kibana';
import { useRefreshAnalyticsList } from '../../common';
import { MlPageHeader } from '../../../components/page_header';
import {
  AnalyticsIdSelector,
  AnalyticsSelectorIds,
  AnalyticsIdSelectorControls,
} from '../components/analytics_selector';
import { AnalyticsEmptyPrompt } from '../analytics_management/components/empty_prompt';

export const Page: FC = () => {
  const [globalState, setGlobalState] = useUrlState('_g');
  const jobId = globalState?.ml?.jobId;
  const modelId = globalState?.ml?.modelId;

  const [isLoading, setIsLoading] = useState(false);
  const [isIdSelectorFlyoutVisible, setIsIdSelectorFlyoutVisible] = useState<boolean>(
    !jobId && !modelId
  );
  const [jobsExist, setJobsExist] = useState(true);
  const { refresh } = useRefreshAnalyticsList({ isLoading: setIsLoading });

  const setAnalyticsId = useCallback(
    (analyticsId: AnalyticsSelectorIds) => {
      setGlobalState({
        ml: {
          ...(analyticsId.job_id && !analyticsId.model_id ? { jobId: analyticsId.job_id } : {}),
          ...(analyticsId.model_id ? { modelId: analyticsId.model_id } : {}),
        },
      });
    },
    [setGlobalState]
  );

  const {
    services: { docLinks },
  } = useMlKibana();
  const {
    dataFrameAnalytics: { getDataFrameAnalytics },
  } = useMlApiContext();
  const helpLink = docLinks.links.ml.dataFrameAnalytics;

  const checkJobsExist = async () => {
    try {
      const { count } = await getDataFrameAnalytics(undefined, undefined, 0);
      setJobsExist(count > 0);
    } catch (e) {
      // Swallow the error and just show the empty table in the analytics id selector
      console.error('Error checking analytics jobs exist', e); // eslint-disable-line no-console
    }
  };

  useEffect(function checkJobs() {
    checkJobsExist();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getEmptyState = () => {
    if (jobsExist === false) {
      return <AnalyticsEmptyPrompt />;
    }
    return (
      <>
        <EuiEmptyPrompt
          iconType="alert"
          title={
            <h2>
              <FormattedMessage
                id="xpack.ml.dataframe.analyticsMap.noJobSelectedLabel"
                defaultMessage="No Analytics ID selected"
              />
            </h2>
          }
          data-test-subj="mlNoAnalyticsFound"
        />
      </>
    );
  };

  return (
    <>
      <AnalyticsIdSelectorControls
        setIsIdSelectorFlyoutVisible={setIsIdSelectorFlyoutVisible}
        selectedId={jobId ?? modelId}
      />
      {isIdSelectorFlyoutVisible ? (
        <AnalyticsIdSelector
          setAnalyticsId={setAnalyticsId}
          setIsIdSelectorFlyoutVisible={setIsIdSelectorFlyoutVisible}
        />
      ) : null}
      {jobId === undefined && modelId === undefined ? (
        <MlPageHeader>
          <FormattedMessage
            data-test-subj="mlPageDataFrameAnalyticsMapTitle"
            id="xpack.ml.dataframe.analyticsMap.title"
            defaultMessage="Map for Analytics"
          />
        </MlPageHeader>
      ) : null}
      {jobId !== undefined && modelId === undefined ? (
        <MlPageHeader>
          <FormattedMessage
            data-test-subj="mlPageDataFrameAnalyticsMapTitle"
            id="xpack.ml.dataframe.analyticsMap.analyticsIdTitle"
            defaultMessage="Map for job ID {jobId}"
            values={{ jobId }}
          />
        </MlPageHeader>
      ) : null}
      {modelId !== undefined && jobId === undefined ? (
        <MlPageHeader>
          <FormattedMessage
            data-test-subj="mlPageDataFrameAnalyticsMapTitle"
            id="xpack.ml.dataframe.analyticsMap.modelIdTitle"
            defaultMessage="Map for trained model ID {modelId}"
            values={{ modelId }}
          />
        </MlPageHeader>
      ) : null}

      <NodeAvailableWarning />

      <SavedObjectsWarning onCloseFlyout={refresh} />
      <UpgradeWarning />

      {jobId || modelId ? (
        <JobMap
          key={`${jobId ?? modelId}-id`}
          analyticsId={jobId}
          modelId={modelId}
          forceRefresh={isLoading}
        />
      ) : (
        getEmptyState()
      )}
      <HelpMenu docLink={helpLink} />
    </>
  );
};
