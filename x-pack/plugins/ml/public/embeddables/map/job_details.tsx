/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
// @ts-nocheck
import React, { FC, useMemo, useState } from 'react';
import type { Embeddable } from '@kbn/lens-plugin/public';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import {
  EuiAccordion,
  EuiButton,
  EuiButtonEmpty,
  EuiCheckbox,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSpacer,
} from '@elastic/eui';
import { useMlFromLensKibanaContext } from '../lens/context';
import { DEFAULT_BUCKET_SPAN } from '../../../common/constants/new_job'; // JOB_TYPE
import { QuickJobCreator } from '../../application/jobs/new_job/job_from_lens';

enum STATE {
  DEFAULT,
  VALIDATING,
  SAVING,
  SAVE_SUCCESS,
  SAVE_FAILED,
}

interface Props {
  embeddable: Embeddable;
}

export const JobDetails: FC<Props> = ({ embeddable }) => {
  const {
    services: {
      data,
      share,
      application,
      uiSettings,
      mlServices: { mlApiServices },
      lens,
    },
  } = useMlFromLensKibanaContext();

  const [jobId, setJobId] = useState<string | undefined>(undefined);
  const [startJob, setStartJob] = useState(true);
  const [runInRealTime, setRunInRealTime] = useState(true);
  const [bucketSpan, setBucketSpan] = useState(DEFAULT_BUCKET_SPAN);

  const [state, setState] = useState<STATE>(STATE.DEFAULT);
  const [createError, setCreateError] = useState<{ text: string; errorText: string } | null>(null);
  const [jobIdValidationError, setJobIdValidationError] = useState<string>('');
  const quickJobCreator = useMemo(
    () =>
      new QuickJobCreator(lens, uiSettings, data.query.timefilter.timefilter, share, mlApiServices),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, uiSettings]
  );

  // function createGeoJobInWizard() {
  //   redirectToADJobWizards(embeddable, layerIndex, share, lens);
  // }

  async function createGeoJob() {
    if (jobId === undefined) {
      return;
    }

    setState(STATE.SAVING);
    setCreateError(null);
    const result = await quickJobCreator.createAndSaveJob(
      jobId,
      bucketSpan,
      embeddable,
      startJob,
      runInRealTime,
      layerIndex
    );
    const error = checkForCreationErrors(result);
    if (error === null) {
      setState(STATE.SAVE_SUCCESS);
    } else {
      setState(STATE.SAVE_FAILED);
      setCreateError(error);
    }
  }

  function setStartJobWrapper(start: boolean) {
    setStartJob(start);
    setRunInRealTime(start && runInRealTime);
  }

  return (
    <>
      <EuiFormRow
        label={i18n.translate('xpack.ml.embeddables.geoJobFlyout.jobDetailsStep.jobId.title', {
          defaultMessage: 'Job ID',
        })}
        error={jobIdValidationError}
        isInvalid={jobIdValidationError !== ''}
      >
        <EuiFieldText
          data-test-subj={'mlEmbeddableMapGeoJobIdInput'}
          value={jobId}
          onChange={(e) => {
            setJobId(e.target.value);
            setState(STATE.VALIDATING);
          }}
        />
      </EuiFormRow>
      <EuiSpacer size="s" />
      <EuiAccordion
        data-test-subj={'mlEmbeddableMapGeoJobAdditionalSettingsButton'}
        id="additional-section"
        buttonContent={i18n.translate(
          'xpack.ml.embeddables.geoJobFlyout.createJobCallout.additionalSettings.title',
          {
            defaultMessage: 'Additional settings',
          }
        )}
      >
        <EuiFormRow>
          <EuiCheckbox
            id="startJob"
            data-test-subj={'mlEmbeddableMapGeoJobStartJobCheckbox'}
            checked={startJob}
            onChange={(e) => setStartJobWrapper(e.target.checked)}
            label={i18n.translate(
              'xpack.ml.embeddables.geoJobFlyout.createJobCallout.additionalSettings.start',
              {
                defaultMessage: 'Start the job after saving',
              }
            )}
          />
        </EuiFormRow>
        <EuiFormRow>
          <EuiCheckbox
            id="realTime"
            disabled={startJob === false}
            data-test-subj={'mlEmbeddableMapGeoJobRealTimeCheckbox'}
            checked={runInRealTime}
            onChange={(e) => setRunInRealTime(e.target.checked)}
            label={i18n.translate(
              'xpack.ml.embeddables.geoJobFlyout.createJobCallout.additionalSettings.realTime',
              {
                defaultMessage: 'Leave the job running for new data',
              }
            )}
          />
        </EuiFormRow>
      </EuiAccordion>
      <EuiSpacer size="m" />
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiButton
            disabled={
              state === STATE.VALIDATING || jobId === '' || jobIdValidationError !== ''
              // bucketSpanValidationError !== ''
            }
            // onClick={createGeoJob.bind(null, layerIndex)}
            onClick={() => {}}
            size="s"
            data-test-subj={'mlEmbeddableMapGeoJobButton'}
          >
            <FormattedMessage
              id="xpack.ml.embeddables.geoJobFlyout.createJobButton.saving"
              defaultMessage="Create job"
            />
          </EuiButton>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            // onClick={createGeoJobInWizard.bind(null, layerIndex)}
            onClick={() => {}}
            size="s"
            iconType="popout"
            iconSide="right"
            data-test-subj={'mlEmbeddableMapGeoJobCreateWithWizardButton'}
          >
            <FormattedMessage
              id="xpack.ml.embeddables.geoJobFlyout.createJobButton"
              defaultMessage="Create job using wizard"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
