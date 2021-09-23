/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useCallback, useState } from 'react';

import { EuiButtonEmpty } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  JobType,
  ML_SAVED_OBJECT_TYPE,
  SavedObjectResult,
} from '../../../../common/types/saved_objects';
import type { SpacesPluginStart, ShareToSpaceFlyoutProps } from '../../../../../spaces/public';
import { ml } from '../../services/ml_api_service';
import { useToastNotificationService } from '../../services/toast_notification_service';

interface Props {
  spacesApi: SpacesPluginStart;
  spaceIds: string[];
  jobId: string;
  jobType: JobType;
  refresh(): void;
}

const ALL_SPACES_ID = '*';
const objectNoun = i18n.translate('xpack.ml.management.jobsSpacesList.objectNoun', {
  defaultMessage: 'job',
});

export const JobSpacesList: FC<Props> = ({ spacesApi, spaceIds, jobId, jobType, refresh }) => {
  const { displayErrorToast } = useToastNotificationService();

  const [showFlyout, setShowFlyout] = useState(false);

  async function changeSpacesHandler(
    _objects: Array<{ type: string; id: string }>, // this is ignored because ML jobs do not have references
    spacesToAdd: string[],
    spacesToMaybeRemove: string[]
  ) {
    // If the user is adding the job to all current and future spaces, don't remove it from any specified spaces
    const spacesToRemove = spacesToAdd.includes(ALL_SPACES_ID) ? [] : spacesToMaybeRemove;

    if (spacesToAdd.length || spacesToRemove.length) {
      const resp = await ml.savedObjects.updateJobsSpaces(
        jobType,
        [jobId],
        spacesToAdd,
        spacesToRemove
      );
      handleApplySpaces(resp);
    }
    onClose();
  }

  function onClose() {
    setShowFlyout(false);
    refresh();
  }

  function handleApplySpaces(resp: SavedObjectResult) {
    Object.entries(resp).forEach(([id, { success, error }]) => {
      if (success === false) {
        const title = i18n.translate('xpack.ml.management.jobsSpacesList.updateSpaces.error', {
          defaultMessage: 'Error updating {id}',
          values: { id },
        });
        displayErrorToast(error, title);
      }
    });
  }

  const LazySpaceList = useCallback(spacesApi.ui.components.getSpaceList, [spacesApi]);
  const LazyShareToSpaceFlyout = useCallback(spacesApi.ui.components.getShareToSpaceFlyout, [
    spacesApi,
  ]);

  const shareToSpaceFlyoutProps: ShareToSpaceFlyoutProps = {
    savedObjectTarget: {
      type: ML_SAVED_OBJECT_TYPE,
      id: jobId,
      namespaces: spaceIds,
      title: jobId,
      noun: objectNoun,
    },
    behaviorContext: 'outside-space',
    changeSpacesHandler,
    onClose,
  };

  return (
    <>
      <EuiButtonEmpty
        onClick={() => setShowFlyout(true)}
        style={{ height: 'auto' }}
        data-test-subj="mlJobListRowManageSpacesButton"
      >
        <LazySpaceList namespaces={spaceIds} displayLimit={0} behaviorContext="outside-space" />
      </EuiButtonEmpty>
      {showFlyout && <LazyShareToSpaceFlyout {...shareToSpaceFlyoutProps} />}
    </>
  );
};
