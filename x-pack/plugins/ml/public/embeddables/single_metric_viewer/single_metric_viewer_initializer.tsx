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
import { SeriesControls } from '../../application/timeseriesexplorer/components/series_controls';
import {
  APP_STATE_ACTION,
  type TimeseriesexplorerActionType,
} from '../../application/timeseriesexplorer/timeseriesexplorer_constants';
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
  const titleManuallyChanged = useRef(false);

  const [jobIds, setJobIds] = useState(initialInput?.jobIds ?? []);
  const [job, setJob] = useState<MlJob | undefined>();
  const isNewJob =
    initialInput?.jobIds !== undefined && jobIds.length && initialInput?.jobIds[0] !== jobIds[0];
  const [panelTitle, setPanelTitle] = useState<string>(initialInput?.title ?? '');
  const [functionDescription, setFunctionDescription] = useState<string | undefined>(
    initialInput?.functionDescription
  );
  // Reset detector index and entities if the job has changed
  const [selectedDetectorIndex, setSelectedDetectorIndex] = useState<number>(
    !isNewJob && initialInput?.selectedDetectorIndex ? initialInput.selectedDetectorIndex : 0
  );
  const [selectedEntities, setSelectedEntities] = useState<MlEntity | undefined>(
    !isNewJob && initialInput?.selectedEntities ? initialInput.selectedEntities : undefined
  );
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const isPanelTitleValid = panelTitle.length > 0;

  useEffect(
    function setUpPanel() {
      if (isMounted()) {
        async function fetchJob() {
          const { jobs } = await mlApiServices.getJobs({ jobId: jobIds.join(',') });
          if (jobs.length > 0) {
            setJob(jobs[0]);
            setErrorMessage(undefined);
          }
        }

        if (jobIds.length === 1) {
          if (!titleManuallyChanged.current) {
            setPanelTitle(getDefaultSingleMetricViewerPanelTitle(jobIds[0]));
          }
          if (mlApiServices) {
            fetchJob().catch((error) => {
              const errorMsg = extractErrorMessage(error);
              setErrorMessage(errorMsg);
            });
          }
        }
      }
    },
    [isMounted, jobIds, mlApiServices]
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
            errors={errorMessage ? [errorMessage] : []}
            jobsAndGroupIds={jobIds}
            adJobsApiService={mlApiServices.jobs}
            onChange={(update) => {
              setJobIds([...(update?.jobIds ?? []), ...(update?.groupIds ?? [])]);
            }}
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
          {job && jobIds.length ? (
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
              isDisabled={!isPanelTitleValid}
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
