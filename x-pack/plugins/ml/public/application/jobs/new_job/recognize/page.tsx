/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useState, Fragment, useEffect } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import {
  EuiPage,
  EuiPageBody,
  EuiTitle,
  EuiPageHeaderSection,
  EuiPageHeader,
  EuiFlexItem,
  EuiFlexGroup,
  EuiText,
  EuiSpacer,
  EuiCallOut,
  EuiPanel,
} from '@elastic/eui';
import { merge } from 'lodash';
import { useMlKibana } from '../../../contexts/kibana';
import { ml } from '../../../services/ml_api_service';
import { useMlContext } from '../../../contexts/ml';
import {
  DatafeedResponse,
  JobOverride,
  JobResponse,
  KibanaObject,
  KibanaObjectResponse,
  ModuleJob,
} from '../../../../../common/types/modules';
import { mlJobService } from '../../../services/job_service';
import { CreateResultCallout } from './components/create_result_callout';
import { KibanaObjects } from './components/kibana_objects';
import { ModuleJobs } from './components/module_jobs';
import { checkForSavedObjects } from './resolvers';
import { JobSettingsForm, JobSettingsFormValues } from './components/job_settings_form';
import { TimeRange } from '../common/components';
import { JobId } from '../../../../../common/types/anomaly_detection_jobs';

export interface ModuleJobUI extends ModuleJob {
  datafeedResult?: DatafeedResponse;
  setupResult?: JobResponse;
}

export type KibanaObjectUi = KibanaObject & KibanaObjectResponse;

export interface KibanaObjects {
  [objectType: string]: KibanaObjectUi[];
}

interface PageProps {
  moduleId: string;
  existingGroupIds: string[];
}

export type JobOverrides = Record<JobId, JobOverride>;

export enum SAVE_STATE {
  NOT_SAVED,
  SAVING,
  SAVED,
  FAILED,
  PARTIAL_FAILURE,
}

export const Page: FC<PageProps> = ({ moduleId, existingGroupIds }) => {
  const {
    services: { notifications },
  } = useMlKibana();
  // #region State
  const [jobPrefix, setJobPrefix] = useState<string>('');
  const [jobs, setJobs] = useState<ModuleJobUI[]>([]);
  const [jobOverrides, setJobOverrides] = useState<JobOverrides>({});
  const [kibanaObjects, setKibanaObjects] = useState<KibanaObjects>({});
  const [saveState, setSaveState] = useState<SAVE_STATE>(SAVE_STATE.NOT_SAVED);
  const [resultsUrl, setResultsUrl] = useState<string>('');
  const [existingGroups, setExistingGroups] = useState(existingGroupIds);
  // #endregion

  const {
    currentSavedSearch: savedSearch,
    currentIndexPattern: indexPattern,
    combinedQuery,
  } = useMlContext();
  const pageTitle =
    savedSearch !== null
      ? i18n.translate('xpack.ml.newJob.recognize.savedSearchPageTitle', {
          defaultMessage: 'saved search {savedSearchTitle}',
          values: { savedSearchTitle: savedSearch.attributes.title as string },
        })
      : i18n.translate('xpack.ml.newJob.recognize.indexPatternPageTitle', {
          defaultMessage: 'index pattern {indexPatternTitle}',
          values: { indexPatternTitle: indexPattern.title },
        });
  const displayQueryWarning = savedSearch !== null;
  const tempQuery = savedSearch === null ? undefined : combinedQuery;

  /**
   * Loads recognizer module configuration.
   */
  const loadModule = async () => {
    try {
      const response = await ml.getDataRecognizerModule({ moduleId });
      setJobs(response.jobs);

      const kibanaObjectsResult = await checkForSavedObjects(response.kibana as KibanaObjects);
      setKibanaObjects(kibanaObjectsResult);

      setSaveState(SAVE_STATE.NOT_SAVED);

      // mix existing groups from the server with the groups used across all jobs in the module.
      const moduleGroups = [...response.jobs.map((j) => j.config.groups || [])].flat();
      setExistingGroups([...new Set([...existingGroups, ...moduleGroups])]);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
    }
  };

  const getTimeRange = async (
    useFullIndexData: boolean,
    timeRange: TimeRange
  ): Promise<TimeRange> => {
    if (useFullIndexData) {
      const { start, end } = await ml.getTimeFieldRange({
        index: indexPattern.title,
        timeFieldName: indexPattern.timeFieldName,
        query: combinedQuery,
      });
      return {
        start: start.epoch,
        end: end.epoch,
      };
    } else {
      return Promise.resolve(timeRange);
    }
  };

  useEffect(() => {
    loadModule();
  }, []);

  /**
   * Sets up recognizer module configuration.
   */
  const save = async (formValues: JobSettingsFormValues) => {
    setSaveState(SAVE_STATE.SAVING);
    const {
      jobPrefix: resultJobPrefix,
      startDatafeedAfterSave,
      useDedicatedIndex,
      useFullIndexData,
      timeRange,
    } = formValues;

    const resultTimeRange = await getTimeRange(useFullIndexData, timeRange);

    try {
      let jobOverridesPayload: JobOverride[] | null = Object.values(jobOverrides);
      jobOverridesPayload = jobOverridesPayload.length > 0 ? jobOverridesPayload : null;

      const response = await ml.setupDataRecognizerConfig({
        moduleId,
        prefix: resultJobPrefix,
        query: tempQuery,
        indexPatternName: indexPattern.title,
        useDedicatedIndex,
        startDatafeed: startDatafeedAfterSave,
        ...(jobOverridesPayload !== null ? { jobOverrides: jobOverridesPayload } : {}),
        ...resultTimeRange,
      });
      const { datafeeds: datafeedsResponse, jobs: jobsResponse, kibana: kibanaResponse } = response;

      setJobs(
        jobs.map((job) => {
          return {
            ...job,
            datafeedResult: datafeedsResponse.find(({ id }) => id.endsWith(job.id)),
            setupResult: jobsResponse.find(({ id }) => id === resultJobPrefix + job.id),
          };
        })
      );
      setKibanaObjects(merge(kibanaObjects, kibanaResponse));
      setResultsUrl(
        mlJobService.createResultsUrl(
          jobsResponse.filter(({ success }) => success).map(({ id }) => id),
          resultTimeRange.start,
          resultTimeRange.end,
          'explorer'
        )
      );
      const failedJobsCount = jobsResponse.reduce((count, { success }) => {
        return success ? count : count + 1;
      }, 0);
      setSaveState(
        failedJobsCount === 0
          ? SAVE_STATE.SAVED
          : failedJobsCount === jobs.length
          ? SAVE_STATE.FAILED
          : SAVE_STATE.PARTIAL_FAILURE
      );
    } catch (e) {
      setSaveState(SAVE_STATE.FAILED);
      // eslint-disable-next-line no-console
      console.error('Error setting up module', e);
      const { toasts } = notifications;
      toasts.addDanger({
        title: i18n.translate('xpack.ml.newJob.recognize.moduleSetupFailedWarningTitle', {
          defaultMessage: 'Error setting up module {moduleId}',
          values: { moduleId },
        }),
        text: i18n.translate('xpack.ml.newJob.recognize.moduleSetupFailedWarningDescription', {
          defaultMessage:
            'An error occurred trying to create the {count, plural, one {job} other {jobs}} in the module.',
          values: {
            count: jobs.length,
          },
        }),
      });
    }
  };

  const onJobOverridesChange = (job: JobOverride) => {
    setJobOverrides({
      ...jobOverrides,
      [job.job_id as string]: job,
    });
    if (job.groups !== undefined) {
      // add newly added jobs to the list of existing groups
      // for use when editing other jobs in the module
      const groups = [...new Set([...existingGroups, ...job.groups])];
      setExistingGroups(groups);
    }
  };

  const isFormVisible = [SAVE_STATE.NOT_SAVED, SAVE_STATE.SAVING].includes(saveState);

  return (
    <EuiPage>
      <EuiPageBody>
        <EuiPageHeader>
          <EuiPageHeaderSection>
            <EuiTitle size="l">
              <h3>
                <FormattedMessage
                  id="xpack.ml.newJob.recognize.newJobFromTitle"
                  defaultMessage="New job from {pageTitle}"
                  values={{ pageTitle }}
                />
              </h3>
            </EuiTitle>
          </EuiPageHeaderSection>
        </EuiPageHeader>

        {displayQueryWarning && (
          <>
            <EuiCallOut
              title={
                <FormattedMessage
                  id="xpack.ml.newJob.recognize.searchWillBeOverwrittenLabel"
                  defaultMessage="Search will be overwritten"
                />
              }
              color="warning"
              iconType="alert"
            >
              <EuiText size="s">
                <FormattedMessage
                  id="xpack.ml.newJob.recognize.usingSavedSearchDescription"
                  defaultMessage="Using a saved search will mean the query used in the datafeeds will be different from the default ones we supply in the {moduleId} module."
                  values={{ moduleId }}
                />
              </EuiText>
            </EuiCallOut>
            <EuiSpacer size="l" />
          </>
        )}

        <EuiFlexGroup wrap={true} gutterSize="m">
          <EuiFlexItem grow={1}>
            <EuiPanel grow={false}>
              <EuiTitle size="s">
                <h4>
                  <FormattedMessage
                    id="xpack.ml.newJob.recognize.jobSettingsTitle"
                    defaultMessage="Job settings"
                  />
                </h4>
              </EuiTitle>

              <EuiSpacer size="m" />

              {isFormVisible && (
                <JobSettingsForm
                  onSubmit={save}
                  onChange={(formValues) => {
                    setJobPrefix(formValues.jobPrefix);
                  }}
                  saveState={saveState}
                  jobs={jobs}
                />
              )}
              <CreateResultCallout
                saveState={saveState}
                resultsUrl={resultsUrl}
                onReset={loadModule}
              />
            </EuiPanel>
          </EuiFlexItem>
          <EuiFlexItem grow={2}>
            <EuiPanel grow={false}>
              <ModuleJobs
                jobs={jobs}
                jobPrefix={jobPrefix}
                saveState={saveState}
                existingGroupIds={existingGroups}
                jobOverrides={jobOverrides}
                onJobOverridesChange={onJobOverridesChange}
              />
            </EuiPanel>
            {Object.keys(kibanaObjects).length > 0 && (
              <>
                <EuiSpacer size="m" />
                <EuiPanel grow={false}>
                  {Object.keys(kibanaObjects).map((objectType, i) => (
                    <Fragment key={objectType}>
                      <KibanaObjects
                        objectType={objectType}
                        kibanaObjects={kibanaObjects[objectType]}
                        isSaving={saveState === SAVE_STATE.SAVING}
                      />
                      {i < Object.keys(kibanaObjects).length - 1 && <EuiSpacer size="s" />}
                    </Fragment>
                  ))}
                </EuiPanel>
              </>
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="l" />
      </EuiPageBody>
    </EuiPage>
  );
};
