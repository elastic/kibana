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
  const [jobId, setJobId] = useState<string | undefined>(
    initialInput?.jobIds && initialInput?.jobIds[0]
  );
  const titleManuallyChanged = useRef(!!initialInput?.title);

  const [job, setJob] = useState<MlJob | undefined>();
  const [panelTitle, setPanelTitle] = useState<string>(initialInput?.title ?? '');
  const [functionDescription, setFunctionDescription] = useState<string | undefined>(
    initialInput?.functionDescription
  );
  // Reset detector index and entities if the job has changed
  const [selectedDetectorIndex, setSelectedDetectorIndex] = useState<number>(
    initialInput?.selectedDetectorIndex ?? 0
  );
  const [selectedEntities, setSelectedEntities] = useState<MlEntity | undefined>(
    initialInput?.selectedEntities
  );
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const isPanelTitleValid = panelTitle.length > 0;

  useEffect(
    function setUpPanel() {
      async function fetchJob() {
        const { jobs } = await mlApiServices.getJobs({ jobId });

        if (isMounted() && jobs.length === 1) {
          setJob(jobs[0]);
          setErrorMessage(undefined);
        }
      }

      if (jobId) {
        if (!titleManuallyChanged.current) {
          setPanelTitle(getDefaultSingleMetricViewerPanelTitle(jobId));
        }
        // Fetch job if a jobId has been selected and if there is no corresponding fetched job or the job selection has changed
        if (mlApiServices && jobId && jobId !== job?.job_id) {
          fetchJob().catch((error) => {
            const errorMsg = extractErrorMessage(error);
            setErrorMessage(errorMsg);
          });
        }
      }
    },
    [isMounted, jobId, mlApiServices, panelTitle, job?.job_id]
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
            jobsAndGroupIds={jobId ? [jobId] : undefined}
            onChange={(update) => {
              setJobId(update?.jobIds && update?.jobIds[0]);
              // Reset values when selected job has changed
              setSelectedDetectorIndex(0);
              setSelectedEntities(undefined);
              setFunctionDescription(undefined);
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
                titleManuallyChanged.current = true;
                setPanelTitle(e.target.value);
              }}
              isInvalid={!isPanelTitleValid}
              fullWidth
            />
          </EuiFormRow>
          <EuiSpacer />
          {job?.job_id && jobId && jobId === job.job_id ? (
            <SeriesControls
              selectedJobId={jobId}
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
                id="xpack.ml.singleMetricViewerEmbeddable.setupModal.cancelButtonLabel"
                defaultMessage="Cancel"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              data-test-subj="mlSingleMetricViewerInitializerConfirmButton"
              isDisabled={!isPanelTitleValid || errorMessage !== undefined || !jobId || !job}
              onClick={onCreate.bind(null, {
                jobIds: jobId ? [jobId] : [],
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
