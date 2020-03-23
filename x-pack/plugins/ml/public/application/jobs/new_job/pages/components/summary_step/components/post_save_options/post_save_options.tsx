/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, Fragment, useContext, useState } from 'react';
import { EuiButton, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { JobRunner } from '../../../../../common/job_runner';
import { useMlKibana } from '../../../../../../../contexts/kibana';

// @ts-ignore
import { CreateWatchFlyout } from '../../../../../../jobs_list/components/create_watch_flyout/index';
import { JobCreatorContext } from '../../../job_creator_context';
import { DATAFEED_STATE } from '../../../../../../../../../common/constants/states';

interface Props {
  jobRunner: JobRunner | null;
}

type ShowFlyout = (jobId: string) => void;

export const PostSaveOptions: FC<Props> = ({ jobRunner }) => {
  const {
    services: { notifications },
  } = useMlKibana();
  const { jobCreator } = useContext(JobCreatorContext);
  const [datafeedState, setDatafeedState] = useState(DATAFEED_STATE.STOPPED);
  const [watchFlyoutVisible, setWatchFlyoutVisible] = useState(false);
  const [watchCreated, setWatchCreated] = useState(false);

  function setShowCreateWatchFlyoutFunction(showFlyout: ShowFlyout) {
    showFlyout(jobCreator.jobId);
  }

  function flyoutHidden(jobCreated: boolean) {
    setWatchFlyoutVisible(false);
    setWatchCreated(jobCreated);
  }

  function unsetShowCreateWatchFlyoutFunction() {
    setWatchFlyoutVisible(false);
  }

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
          text: error.message,
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
            datafeedState === DATAFEED_STATE.STOPPED ||
            datafeedState === DATAFEED_STATE.STARTING ||
            watchCreated === true
          }
          onClick={() => setWatchFlyoutVisible(true)}
          data-test-subj="mlJobWizardButtonCreateWatch"
        >
          <FormattedMessage
            id="xpack.ml.newJob.wizard.summaryStep.postSaveOptions.createWatch"
            defaultMessage="Create watch"
          />
        </EuiButton>
      </EuiFlexItem>

      {datafeedState === DATAFEED_STATE.STARTED && watchFlyoutVisible && (
        <CreateWatchFlyout
          setShowFunction={setShowCreateWatchFlyoutFunction}
          unsetShowFunction={unsetShowCreateWatchFlyoutFunction}
          flyoutHidden={flyoutHidden}
        />
      )}
    </Fragment>
  );
};
