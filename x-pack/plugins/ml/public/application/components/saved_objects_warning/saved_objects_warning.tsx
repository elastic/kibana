/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { EuiCallOut, EuiLink, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { JobType } from '../../../../common/types/saved_objects';
import { useMlApiContext } from '../../contexts/kibana';
import { JobSpacesSyncFlyout } from '../../components/job_spaces_sync';
import { checkPermission } from '../../capabilities/check_capabilities';

interface Props {
  jobType?: JobType;
  onCloseFlyout?: () => void;
  forceRefresh?: boolean;
}

export const SavedObjectsWarning: FC<Props> = ({ jobType, onCloseFlyout, forceRefresh }) => {
  const {
    savedObjects: { initSavedObjects },
  } = useMlApiContext();

  const mounted = useRef(false);
  const [showWarning, setShowWarning] = useState(false);
  const [showSyncFlyout, setShowSyncFlyout] = useState(false);
  const canCreateJob = useMemo(() => checkPermission('canCreateJob'), []);

  const checkStatus = useCallback(() => {
    initSavedObjects(true)
      .then(({ jobs, datafeeds }) => {
        if (mounted.current === false) {
          return;
        }

        const missingJobs =
          jobs.length > 0 && (jobType === undefined || jobs.some(({ type }) => type === jobType));

        const missingDatafeeds = datafeeds.length > 0 && jobType === 'anomaly-detector';

        setShowWarning(showSyncFlyout || missingJobs || missingDatafeeds);
      })
      .catch(() => {
        console.log('Saved object synchronization check could not be performed.'); // eslint-disable-line no-console
      });
  }, [showSyncFlyout, setShowWarning]);

  useEffect(() => {
    mounted.current = true;
    if (forceRefresh === undefined || forceRefresh === true) {
      checkStatus();
    }
    return () => {
      mounted.current = false;
    };
  }, [forceRefresh, mounted]);

  const onClose = useCallback(() => {
    if (forceRefresh === undefined) {
      checkStatus();
    }
    setShowSyncFlyout(false);
    if (typeof onCloseFlyout === 'function') {
      onCloseFlyout();
    }
  }, [checkStatus, onCloseFlyout, setShowSyncFlyout]);

  useEffect(() => {
    if (showWarning === false) {
      setShowSyncFlyout(false);
    }
  }, [showWarning, setShowSyncFlyout]);

  return showWarning === false ? null : (
    <>
      <EuiCallOut
        title={
          <FormattedMessage
            id="xpack.ml.jobsList.missingSavedObjectWarning.title"
            defaultMessage="ML job synchronization required"
          />
        }
        color="warning"
        iconType="alert"
        data-test-subj="mlJobSyncRequiredWarning"
      >
        <>
          <FormattedMessage
            id="xpack.ml.jobsList.missingSavedObjectWarning.description"
            defaultMessage="Some jobs are missing or have incomplete saved objects."
          />
          {canCreateJob ? (
            <FormattedMessage
              id="xpack.ml.jobsList.missingSavedObjectWarning.link"
              defaultMessage=" {link}"
              values={{
                link: (
                  <EuiLink onClick={() => setShowSyncFlyout(true)}>
                    <FormattedMessage
                      id="xpack.ml.jobsList.missingSavedObjectWarning.linkToManagement.link"
                      defaultMessage="Synchronize your jobs."
                    />
                  </EuiLink>
                ),
              }}
            />
          ) : (
            <FormattedMessage
              id="xpack.ml.jobsList.missingSavedObjectWarning.noPermission"
              defaultMessage="Go to Stack Management to synchronize your jobs."
            />
          )}
          {showSyncFlyout && <JobSpacesSyncFlyout onClose={onClose} />}
        </>
      </EuiCallOut>
      <EuiSpacer size="m" />
    </>
  );
};
