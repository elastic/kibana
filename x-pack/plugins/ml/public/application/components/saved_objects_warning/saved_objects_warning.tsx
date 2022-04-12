/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { EuiCallOut, EuiLink, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { MlSavedObjectType } from '../../../../common/types/saved_objects';
import { useMlApiContext } from '../../contexts/kibana';
import { JobSpacesSyncFlyout } from '../../components/job_spaces_sync';
import { checkPermission } from '../../capabilities/check_capabilities';

interface Props {
  mlSavedObjectType?: MlSavedObjectType;
  onCloseFlyout?: () => void;
  forceRefresh?: boolean;
}

export const SavedObjectsWarning: FC<Props> = ({
  mlSavedObjectType,
  onCloseFlyout,
  forceRefresh,
}) => {
  const {
    savedObjects: { syncCheck },
  } = useMlApiContext();

  const mounted = useRef(false);
  const [showWarning, setShowWarning] = useState(false);
  const [showSyncFlyout, setShowSyncFlyout] = useState(false);
  const canCreateJob = useMemo(() => checkPermission('canCreateJob'), []);

  const checkStatus = useCallback(async () => {
    try {
      if (mounted.current === false) {
        return;
      }

      const { result } = await syncCheck(mlSavedObjectType);

      if (mounted.current === true) {
        setShowWarning(showSyncFlyout || result);
      }
    } catch (error) {
      console.log('Saved object synchronization check could not be performed.'); // eslint-disable-line no-console
    }
  }, [showSyncFlyout, setShowWarning]);

  useEffect(
    function initialStatusCheck() {
      mounted.current = true;
      if (forceRefresh === undefined || forceRefresh === true) {
        checkStatus();
      }
      return () => {
        mounted.current = false;
      };
    },
    [forceRefresh, mounted, checkStatus]
  );

  const onClose = useCallback(() => {
    setShowSyncFlyout(false);
    if (forceRefresh === undefined) {
      checkStatus();
    }
    if (typeof onCloseFlyout === 'function') {
      onCloseFlyout();
    }
  }, [checkStatus, onCloseFlyout, setShowSyncFlyout]);

  useEffect(
    function hideSyncFlyoutOnWarningClose() {
      if (showWarning === false && mounted.current === true) {
        setShowSyncFlyout(false);
      }
    },
    [showWarning, setShowSyncFlyout]
  );

  return showWarning === false ? null : (
    <>
      <EuiCallOut
        title={
          <FormattedMessage
            id="xpack.ml.jobsList.missingSavedObjectWarning.title"
            defaultMessage="ML job and trained model synchronization required"
          />
        }
        color="warning"
        iconType="alert"
        data-test-subj="mlJobSyncRequiredWarning"
      >
        <>
          <FormattedMessage
            id="xpack.ml.jobsList.missingSavedObjectWarning.description"
            defaultMessage="Some jobs or trained models are missing or have incomplete saved objects. "
          />
          {canCreateJob ? (
            <FormattedMessage
              id="xpack.ml.jobsList.missingSavedObjectWarning.link"
              defaultMessage=" {link}"
              values={{
                link: (
                  <EuiLink onClick={setShowSyncFlyout.bind(null, true)}>
                    <FormattedMessage
                      id="xpack.ml.jobsList.missingSavedObjectWarning.linkToManagement.link"
                      defaultMessage="Synchronize your jobs and trained models."
                    />
                  </EuiLink>
                ),
              }}
            />
          ) : (
            <FormattedMessage
              id="xpack.ml.jobsList.missingSavedObjectWarning.noPermission"
              defaultMessage="An Administrator can synchronize the jobs and trained models in Stack Management."
            />
          )}
          {showSyncFlyout && <JobSpacesSyncFlyout onClose={onClose} />}
        </>
      </EuiCallOut>
      <EuiSpacer size="m" />
    </>
  );
};
