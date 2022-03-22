/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useState, useEffect } from 'react';
import { EuiEmptyPrompt } from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n-react';
import { useUrlState } from '../../../util/url_state';
import { NodeAvailableWarning } from '../../../components/node_available_warning';
import { SavedObjectsWarning } from '../../../components/saved_objects_warning';
import { UpgradeWarning } from '../../../components/upgrade';
import { JobMap } from '../job_map';
import { HelpMenu } from '../../../components/help_menu';
import { useMlKibana, useMlApiContext } from '../../../contexts/kibana';
import { useRefreshAnalyticsList } from '../../common';
import { MlPageHeader } from '../../../components/page_header';
import { AnalyticsIdSelector, AnalyticsSelectorIds } from '../components/analytics_selector';
import { AnalyticsEmptyPrompt } from '../analytics_management/components/empty_prompt';

export const Page: FC = () => {
  const [globalState, setGlobalState] = useUrlState('_g');
  const [isLoading, setIsLoading] = useState(false);
  const [jobsExist, setJobsExist] = useState(true);
  const { refresh } = useRefreshAnalyticsList({ isLoading: setIsLoading });
  const mapJobId = globalState?.ml?.jobId;
  const mapModelId = globalState?.ml?.modelId;
  const [analyticsId, setAnalyticsId] = useState<AnalyticsSelectorIds>();
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
      console.error('Error checking analytics jobs exist', e); // eslint-disable-line
    }
  };

  useEffect(function checkJobs() {
    checkJobsExist();
  }, []);

  useEffect(function updateUrl() {
    if (analyticsId !== undefined) {
      setGlobalState({
        ml: {
          ...(analyticsId.job_id && !analyticsId.model_id ? { jobId: analyticsId.job_id } : {}),
          ...(analyticsId.model_id ? { modelId: analyticsId.model_id } : {}),
        },
      });
    }
  }, [analyticsId?.job_id, analyticsId?.model_id]);

  const getEmptyState = () => {
    if (jobsExist === false) {
      return <AnalyticsEmptyPrompt />;
    }
    return (
      <>
        <AnalyticsIdSelector setAnalyticsId={setAnalyticsId} />
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

  const jobId = mapJobId ?? analyticsId?.job_id;
  const modelId = mapModelId ?? analyticsId?.model_id;

  return (
    <>
      {jobId === undefined && modelId === undefined ? (
        <MlPageHeader>
          <FormattedMessage
            data-test-subj="mlPageDataFrameAnalyticsMapTitle"
            id="xpack.ml.dataframe.analyticsMap.title"
            defaultMessage="Map for Analytics"
          />
        </MlPageHeader>
      ) : null}
      {jobId !== undefined ? (
        <MlPageHeader>
          <FormattedMessage
            data-test-subj="mlPageDataFrameAnalyticsMapTitle"
            id="xpack.ml.dataframe.analyticsMap.analyticsIdTitle"
            defaultMessage="Map for job ID {jobId}"
            values={{ jobId }}
          />
        </MlPageHeader>
      ) : null}
      {modelId !== undefined ? (
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

      <SavedObjectsWarning
        mlSavedObjectType="data-frame-analytics"
        onCloseFlyout={refresh}
        forceRefresh={isLoading}
      />
      <UpgradeWarning />

      {mapJobId || mapModelId || analyticsId ? (
        <JobMap
          analyticsId={mapJobId || analyticsId?.job_id}
          modelId={mapModelId || analyticsId?.model_id}
        />
      ) : (
        getEmptyState()
      )}
      <HelpMenu docLink={helpLink} />
    </>
  );
};
