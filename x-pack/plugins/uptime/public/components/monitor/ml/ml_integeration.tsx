/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { MachineLearningFlyout } from './ml_flyout_container';
import {
  hasMLFeatureAvailable,
  hasMLJobSelector,
  isMLJobDeletedSelector,
  isMLJobDeletingSelector,
} from '../../../state/selectors';
import { deleteMLJobAction, getExistingMLJobAction, resetMLState } from '../../../state/actions';
import { ConfirmJobDeletion } from './confirm_delete';
import { UptimeRefreshContext } from '../../../contexts';
import { getMLJobId } from '../../../state/api/ml_anomaly';
import * as labels from './translations';
import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';
import { ManageMLJobComponent } from './manage_ml_job';
import { JobStat } from '../../../../../../plugins/ml/common/types/data_recognizer';
import { useMonitorId } from '../../../hooks';

export const MLIntegrationComponent = () => {
  const [isMlFlyoutOpen, setIsMlFlyoutOpen] = useState(false);
  const [isConfirmDeleteJobOpen, setIsConfirmDeleteJobOpen] = useState(false);

  const { lastRefresh, refreshApp } = useContext(UptimeRefreshContext);

  const { notifications } = useKibana();

  const monitorId = useMonitorId();

  const dispatch = useDispatch();

  const isMLAvailable = useSelector(hasMLFeatureAvailable);

  const deleteMLJob = () => dispatch(deleteMLJobAction.get({ monitorId: monitorId as string }));
  const isMLJobDeleting = useSelector(isMLJobDeletingSelector);
  const { data: jobDeletionSuccess } = useSelector(isMLJobDeletedSelector);

  const { data: uptimeJobs } = useSelector(hasMLJobSelector);

  const hasMLJob =
    !!uptimeJobs?.jobsExist &&
    !!uptimeJobs.jobs.find((job: JobStat) => job.id === getMLJobId(monitorId as string));

  useEffect(() => {
    if (isMLAvailable) {
      dispatch(getExistingMLJobAction.get({ monitorId: monitorId as string }));
    }
  }, [dispatch, isMLAvailable, monitorId, lastRefresh]);

  useEffect(() => {
    if (isConfirmDeleteJobOpen && jobDeletionSuccess?.[getMLJobId(monitorId as string)]?.deleted) {
      setIsConfirmDeleteJobOpen(false);
      notifications.toasts.success({
        title: <p data-test-subj="uptimeMLJobSuccessfullyDeleted">{labels.JOB_DELETION}</p>,
        body: <p>{labels.JOB_DELETION_SUCCESS}</p>,
        toastLifeTimeMs: 3000,
      });
      dispatch(resetMLState());

      refreshApp();
    }
  }, [
    isMLJobDeleting,
    isConfirmDeleteJobOpen,
    jobDeletionSuccess,
    monitorId,
    refreshApp,
    notifications.toasts,
    dispatch,
  ]);

  const onEnableJobClick = () => {
    setIsMlFlyoutOpen(true);
  };

  const closeFlyout = () => {
    setIsMlFlyoutOpen(false);
  };

  const confirmDeleteMLJob = () => {
    setIsConfirmDeleteJobOpen(true);
  };

  return (
    <>
      <ManageMLJobComponent
        hasMLJob={hasMLJob as boolean}
        onEnableJob={onEnableJobClick}
        onJobDelete={confirmDeleteMLJob}
      />
      {isMlFlyoutOpen && <MachineLearningFlyout onClose={closeFlyout} />}
      {isConfirmDeleteJobOpen && (
        <ConfirmJobDeletion
          onConfirm={deleteMLJob}
          loading={isMLJobDeleting}
          onCancel={() => {
            setIsConfirmDeleteJobOpen(false);
          }}
        />
      )}
    </>
  );
};
