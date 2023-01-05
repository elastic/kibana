/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useState, useEffect } from 'react';
import { EuiEmptyPrompt } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import { useUrlState } from '@kbn/ml-url-state';
import { OutlierExploration } from './components/outlier_exploration';
import { RegressionExploration } from './components/regression_exploration';
import { ClassificationExploration } from './components/classification_exploration';

import { ANALYSIS_CONFIG_TYPE } from '../../../../../common/constants/data_frame_analytics';
import { DataFrameAnalysisConfigType } from '../../../../../common/types/data_frame_analytics';
import { HelpMenu } from '../../../components/help_menu';
import { useMlKibana, useMlApiContext } from '../../../contexts/kibana';
import { MlPageHeader } from '../../../components/page_header';
import {
  AnalyticsIdSelector,
  AnalyticsSelectorIds,
  AnalyticsIdSelectorControls,
} from '../components/analytics_selector';
import { AnalyticsEmptyPrompt } from '../analytics_management/components/empty_prompt';
import { SavedObjectsWarning } from '../../../components/saved_objects_warning';

export const Page: FC<{
  jobId: string;
  analysisType: DataFrameAnalysisConfigType;
}> = ({ jobId, analysisType }) => {
  const [analyticsId, setAnalyticsId] = useState<AnalyticsSelectorIds | undefined>();
  const [isIdSelectorFlyoutVisible, setIsIdSelectorFlyoutVisible] = useState<boolean>(!jobId);
  const [jobsExist, setJobsExist] = useState(true);
  const {
    services: { docLinks },
  } = useMlKibana();
  const {
    dataFrameAnalytics: { getDataFrameAnalytics },
  } = useMlApiContext();
  const helpLink = docLinks.links.ml.dataFrameAnalytics;
  const jobIdToUse = jobId ?? analyticsId?.job_id;
  const [analysisTypeToUse, setAnalysisTypeToUse] = useState<
    DataFrameAnalysisConfigType | undefined
  >(analysisType || analyticsId?.analysis_type);

  const [, setGlobalState] = useUrlState('_g');

  const checkJobsExist = async () => {
    try {
      const { count } = await getDataFrameAnalytics(undefined, undefined, 0);
      setJobsExist(count > 0);
    } catch (e) {
      // Swallow the error and just show the empty table in the analytics id selector
      console.error('Error checking analytics jobs exist', e); // eslint-disable-line no-console
    }
  };

  // The inner components of the results page don't have a concept of reloading the full page.
  // Because we might want to refresh though if a user has to fix unsynced saved objects,
  // we achieve this here by unmounting the inner pages first by setting `analysisTypeToUse`
  // to `undefined`. The `useEffect()` below will then check if `analysisTypeToUse` doesn't
  // match the passed in analyis type and will update it once again, the re-mounted
  // page will then again fetch the most recent results.
  const refresh = () => {
    setAnalysisTypeToUse(undefined);
  };

  useEffect(
    function checkRefresh() {
      if (analysisTypeToUse !== analysisType || analyticsId?.analysis_type) {
        setAnalysisTypeToUse(analysisType || analyticsId?.analysis_type);
      }
    },
    [analyticsId, analysisType, analysisTypeToUse]
  );

  useEffect(function checkJobs() {
    checkJobsExist();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(
    function updateUrl() {
      if (analyticsId !== undefined) {
        setGlobalState({
          ml: {
            ...(analyticsId.analysis_type ? { analysisType: analyticsId.analysis_type } : {}),
            ...(analyticsId.job_id ? { jobId: analyticsId.job_id } : {}),
          },
        });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [analyticsId?.job_id, analyticsId?.model_id]
  );

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
        selectedId={jobIdToUse}
      />
      {isIdSelectorFlyoutVisible ? (
        <AnalyticsIdSelector
          setAnalyticsId={setAnalyticsId}
          setIsIdSelectorFlyoutVisible={setIsIdSelectorFlyoutVisible}
        />
      ) : null}
      {jobIdToUse !== undefined && (
        <MlPageHeader>
          <FormattedMessage
            id="xpack.ml.dataframe.analyticsExploration.titleWithId"
            defaultMessage="Explore results for job ID {id}"
            values={{ id: jobIdToUse }}
          />
        </MlPageHeader>
      )}
      {jobIdToUse === undefined && (
        <MlPageHeader>
          <FormattedMessage
            id="xpack.ml.dataframe.analyticsExploration.title"
            defaultMessage="Explore results"
          />
        </MlPageHeader>
      )}

      <SavedObjectsWarning onCloseFlyout={refresh} />

      {jobIdToUse && analysisTypeToUse ? (
        <div data-test-subj="mlPageDataFrameAnalyticsExploration">
          {analysisTypeToUse === ANALYSIS_CONFIG_TYPE.OUTLIER_DETECTION && (
            <OutlierExploration jobId={jobIdToUse} />
          )}
          {analysisTypeToUse === ANALYSIS_CONFIG_TYPE.REGRESSION && (
            <RegressionExploration jobId={jobIdToUse} />
          )}
          {analysisTypeToUse === ANALYSIS_CONFIG_TYPE.CLASSIFICATION && (
            <ClassificationExploration jobId={jobIdToUse} />
          )}
        </div>
      ) : (
        getEmptyState()
      )}
      <HelpMenu docLink={helpLink} />
    </>
  );
};
