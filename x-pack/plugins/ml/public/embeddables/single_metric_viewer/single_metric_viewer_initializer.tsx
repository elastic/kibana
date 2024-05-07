/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useEffect, useRef, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiTitle,
  EuiFieldText,
  EuiSpacer,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import useMountedState from 'react-use/lib/useMountedState';
import { extractErrorMessage } from '@kbn/ml-error-utils';
import type { MlJob } from '@elastic/elasticsearch/lib/api/types';
import type { TimeRangeBounds } from '@kbn/ml-time-buckets';
import type { MlApiServices } from '../../application/services/ml_api_service';
import type { SingleMetricViewerEmbeddableInput } from '..';
import { ML_PAGES } from '../../../common/constants/locator';
import { SeriesControls } from '../../application/timeseriesexplorer/components/series_controls';
import {
  APP_STATE_ACTION,
  type TimeseriesexplorerActionType,
} from '../../application/timeseriesexplorer/timeseriesexplorer_constants';
import { useMlLink } from '../../application/contexts/kibana';
import { JobSelectorControl } from '../../alerting/job_selector';
import type { SingleMetricViewerEmbeddableUserInput, MlEntity } from '..';
import { getDefaultSingleMetricViewerPanelTitle } from './get_default_panel_title';

export interface SingleMetricViewerInitializerProps {
  bounds: TimeRangeBounds;
  initialInput?: Partial<SingleMetricViewerEmbeddableInput>;
  mlApiServices: MlApiServices;
  onCreate: (props: SingleMetricViewerEmbeddableUserInput) => void;
  onCancel: () => void;
}

export const SingleMetricViewerInitializer: FC<SingleMetricViewerInitializerProps> = ({
  bounds,
  initialInput,
  onCreate,
  onCancel,
  mlApiServices,
}) => {
  const isMounted = useMountedState();
  const newJobUrl = useMlLink({ page: ML_PAGES.ANOMALY_DETECTION_CREATE_JOB });
  const [jobIds, setJobIds] = useState(initialInput?.jobIds ?? []);

  const initialValuesRef = useRef({
    titleManuallyChanged: !!initialInput?.title,
    isNewJob:
      initialInput?.jobIds !== undefined && jobIds.length && initialInput?.jobIds[0] !== jobIds[0],
  });

  const [job, setJob] = useState<MlJob | undefined>();
  const [panelTitle, setPanelTitle] = useState<string>(initialInput?.title ?? '');
  const [functionDescription, setFunctionDescription] = useState<string | undefined>(
    initialInput?.functionDescription
  );
  // Reset detector index and entities if the job has changed
  const [selectedDetectorIndex, setSelectedDetectorIndex] = useState<number>(
    !initialValuesRef.current.isNewJob && initialInput?.selectedDetectorIndex
      ? initialInput.selectedDetectorIndex
      : 0
  );
  const [selectedEntities, setSelectedEntities] = useState<MlEntity | undefined>(
    !initialValuesRef.current.isNewJob && initialInput?.selectedEntities
      ? initialInput.selectedEntities
      : undefined
  );
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const isPanelTitleValid = panelTitle.length > 0;

  useEffect(
    function setUpPanel() {
      if (isMounted()) {
        async function fetchJob() {
          const { jobs } = await mlApiServices.getJobs({ jobId: jobIds.join(',') });

          if (jobs.length > 0) {
            // Reset values if the job has changed
            if (initialValuesRef.current.isNewJob) {
              setSelectedDetectorIndex(0);
              setSelectedEntities(undefined);
              setFunctionDescription(undefined);
            }

            setJob(jobs[0]);
            setErrorMessage(undefined);
          }
        }

        if (jobIds.length === 1) {
          if (!initialValuesRef.current.titleManuallyChanged) {
            setPanelTitle(getDefaultSingleMetricViewerPanelTitle(jobIds[0]));
          }
          if (mlApiServices && jobIds.length === 1 && jobIds[0] !== job?.job_id) {
            fetchJob().catch((error) => {
              const errorMsg = extractErrorMessage(error);
              setErrorMessage(errorMsg);
            });
          }
        }
      }
    },
    [isMounted, jobIds, mlApiServices, panelTitle, initialValuesRef.current.isNewJob, job?.job_id]
  );

  const handleStateUpdate = (
    action: TimeseriesexplorerActionType,
    payload: string | number | MlEntity
  ) => {
    switch (action) {
      case APP_STATE_ACTION.SET_ENTITIES:
        setSelectedEntities(payload as MlEntity);
        break;
      case APP_STATE_ACTION.SET_FUNCTION_DESCRIPTION:
        setFunctionDescription(payload as string);
        break;
      case APP_STATE_ACTION.SET_DETECTOR_INDEX:
        setSelectedDetectorIndex(payload as number);
        break;
      default:
        break;
    }
  };

  return (
    <>
      <EuiFlyoutHeader>
        <EuiTitle>
          <h2>
            <FormattedMessage
              id="xpack.ml.SingleMetricViewerEmbeddable.setupModal.title"
              defaultMessage="Single metric viewer configuration"
            />
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <EuiForm>
          <JobSelectorControl
            adJobsApiService={mlApiServices.jobs}
            createJobUrl={newJobUrl}
            jobsAndGroupIds={jobIds}
            onChange={(update) => {
              initialValuesRef.current.isNewJob =
                update?.jobIds !== undefined && update.jobIds[0] !== jobIds[0];
              setJobIds([...(update?.jobIds ?? []), ...(update?.groupIds ?? [])]);
            }}
            {...(errorMessage && { errors: [errorMessage] })}
          />
          <EuiFormRow
            label={
              <FormattedMessage
                id="xpack.ml.singleMetricViewerEmbeddable.panelTitleLabel"
                defaultMessage="Panel title"
              />
            }
            isInvalid={!isPanelTitleValid}
            fullWidth
          >
            <EuiFieldText
              data-test-subj="panelTitleInput"
              id="panelTitle"
              name="panelTitle"
              value={panelTitle}
              onChange={(e) => {
                initialValuesRef.current.titleManuallyChanged = true;
                setPanelTitle(e.target.value);
              }}
              isInvalid={!isPanelTitleValid}
              fullWidth
            />
          </EuiFormRow>
          <EuiSpacer />
          {job && job.job_id && jobIds.length && jobIds[0] === job.job_id ? (
            <SeriesControls
              selectedJobId={jobIds[0]}
              job={job}
              direction="column"
              appStateHandler={handleStateUpdate}
              selectedDetectorIndex={selectedDetectorIndex}
              selectedEntities={selectedEntities}
              bounds={bounds}
              functionDescription={functionDescription}
              setFunctionDescription={setFunctionDescription}
            />
          ) : null}
        </EuiForm>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent={'spaceBetween'}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              onClick={onCancel}
              data-test-subj="mlsingleMetricViewerInitializerCancelButton"
            >
              <FormattedMessage
                id="xpack.ml.singleMetricViewerEmbeddable.CancelButtonLabel"
                defaultMessage="Cancel"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              isDisabled={!isPanelTitleValid || errorMessage !== undefined || !jobIds.length}
              onClick={onCreate.bind(null, {
                jobIds,
                functionDescription,
                panelTitle,
                selectedDetectorIndex,
                selectedEntities,
              })}
              fill
            >
              <FormattedMessage
                id="xpack.ml.singleMetricViewerEmbeddable.setupModal.confirmButtonLabel"
                defaultMessage="Confirm"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
};
