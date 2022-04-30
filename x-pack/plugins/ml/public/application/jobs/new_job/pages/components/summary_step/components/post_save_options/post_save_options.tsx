/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, Fragment, useContext, useState } from 'react';
import { EuiButton, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { JobRunner } from '../../../../../common/job_runner';
import { useMlKibana } from '../../../../../../../contexts/kibana';
import { extractErrorMessage } from '../../../../../../../../../common/util/errors';

import { JobCreatorContext } from '../../../job_creator_context';
import { DATAFEED_STATE } from '../../../../../../../../../common/constants/states';
import { MlAnomalyAlertFlyout } from '../../../../../../../../alerting/ml_alerting_flyout';

interface Props {
  jobRunner: JobRunner | null;
}

export const PostSaveOptions: FC<Props> = ({ jobRunner }) => {
  const {
    services: { notifications },
  } = useMlKibana();
  const { jobCreator } = useContext(JobCreatorContext);
  const [datafeedState, setDatafeedState] = useState(DATAFEED_STATE.STOPPED);
  const [alertFlyoutVisible, setAlertFlyoutVisible] = useState(false);

  async function startJobInRealTime() {
    const { toasts } = notifications;
    setDatafeedState(DATAFEED_STATE.STARTING);
    if (jobRunner !== null) {
      try {
        const started = await jobRunner.startDatafeedInRealTime(true);
        setDatafeedState(started === true ? DATAFEED_STATE.STARTED : DATAFEED_STATE.STOPPED);
        toasts.addSuccess({
          title: i18n.translate(
            'xpack.ml.newJob.wizard.summaryStep.postSaveOptions.startJobInRealTimeSuccess',
            {
              defaultMessage: `Job {jobId} started`,
              values: { jobId: jobCreator.jobId },
            }
          ),
        });
      } catch (error) {
        setDatafeedState(DATAFEED_STATE.STOPPED);
        toasts.addDanger({
          title: i18n.translate(
            'xpack.ml.newJob.wizard.summaryStep.postSaveOptions.startJobInRealTimeError',
            {
              defaultMessage: `Error starting job`,
            }
          ),
          text: extractErrorMessage(error),
        });
      }
    }
  }

  return (
    <Fragment>
      <EuiFlexItem grow={false}>
        <EuiButton
          isDisabled={
            datafeedState === DATAFEED_STATE.STARTING || datafeedState === DATAFEED_STATE.STARTED
          }
          onClick={startJobInRealTime}
          data-test-subj="mlJobWizardButtonRunInRealTime"
        >
          <FormattedMessage
            id="xpack.ml.newJob.wizard.summaryStep.postSaveOptions.startJobInRealTime"
            defaultMessage="Start job running in real time"
          />
        </EuiButton>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiButton
          isDisabled={
            datafeedState === DATAFEED_STATE.STOPPED || datafeedState === DATAFEED_STATE.STARTING
          }
          onClick={setAlertFlyoutVisible.bind(null, true)}
          data-test-subj="mlJobWizardButtonCreateAlert"
        >
          <FormattedMessage
            id="xpack.ml.newJob.wizard.summaryStep.postSaveOptions.createAlert"
            defaultMessage="Create alert rule"
          />
        </EuiButton>
      </EuiFlexItem>

      {datafeedState === DATAFEED_STATE.STARTED && alertFlyoutVisible && (
        <MlAnomalyAlertFlyout
          jobIds={[jobCreator.jobId]}
          onCloseFlyout={setAlertFlyoutVisible.bind(null, false)}
        />
      )}
    </Fragment>
  );
};
