/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { JobStat } from '@kbn/ml-plugin/public';
import { MachineLearningFlyout } from './ml_flyout_container';
import {
  hasMLFeatureSelector,
  hasMLJobSelector,
  isMLJobDeletedSelector,
  isMLJobDeletingSelector,
} from '../../../state/selectors';
import { deleteMLJobAction, getExistingMLJobAction, resetMLState } from '../../../state/actions';
import { ConfirmJobDeletion } from './confirm_delete';
import { UptimeRefreshContext } from '../../../contexts';
import * as labels from './translations';
import { ManageMLJobComponent } from './manage_ml_job';
import { useMonitorId } from '../../../hooks';
import { getMLJobId } from '../../../../common/lib';

export const MLIntegrationComponent = () => {
  const [isMlFlyoutOpen, setIsMlFlyoutOpen] = useState(false);
  const [isConfirmDeleteJobOpen, setIsConfirmDeleteJobOpen] = useState(false);

  const { lastRefresh, refreshApp } = useContext(UptimeRefreshContext);

  const { notifications } = useKibana();

  const monitorId = useMonitorId();

  const dispatch = useDispatch();

  const isMLAvailable = useSelector(hasMLFeatureSelector);

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
    return () => {
      dispatch(resetMLState());
    };
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
