/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useCallback, useState } from 'react';

import { EuiButtonEmpty } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { SpacesPluginStart, ShareToSpaceFlyoutProps } from '@kbn/spaces-plugin/public';
import {
  ML_JOB_SAVED_OBJECT_TYPE,
  SavedObjectResult,
  MlSavedObjectType,
} from '../../../../common/types/saved_objects';
import { useMlApiContext } from '../../contexts/kibana';
import { useToastNotificationService } from '../../services/toast_notification_service';

interface Props {
  spacesApi: SpacesPluginStart;
  spaceIds: string[];
  id: string;
  mlSavedObjectType: MlSavedObjectType;
  refresh(): void;
}

const ALL_SPACES_ID = '*';
const jobObjectNoun = i18n.translate('xpack.ml.management.jobsSpacesList.jobObjectNoun', {
  defaultMessage: 'job',
});

const modelObjectNoun = i18n.translate('xpack.ml.management.jobsSpacesList.modelObjectNoun', {
  defaultMessage: 'trained model',
});

export const MLSavedObjectsSpacesList: FC<Props> = ({
  spacesApi,
  spaceIds,
  id,
  mlSavedObjectType,
  refresh,
}) => {
  const {
    savedObjects: { updateJobsSpaces, updateModelsSpaces },
  } = useMlApiContext();
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
      if (mlSavedObjectType === 'trained-model') {
        const resp = await updateModelsSpaces([id], spacesToAdd, spacesToRemove);
        handleApplySpaces(resp);
      } else {
        const resp = await updateJobsSpaces(mlSavedObjectType, [id], spacesToAdd, spacesToRemove);
        handleApplySpaces(resp);
      }
    }
    onClose();
  }

  function onClose() {
    setShowFlyout(false);
    refresh();
  }

  function handleApplySpaces(resp: SavedObjectResult) {
    Object.entries(resp).forEach(([errorId, { success, error }]) => {
      if (success === false) {
        const title = i18n.translate('xpack.ml.management.jobsSpacesList.updateSpaces.error', {
          defaultMessage: 'Error updating {id}',
          values: { id: errorId },
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
      type: ML_JOB_SAVED_OBJECT_TYPE,
      id,
      namespaces: spaceIds,
      title: id,
      noun: mlSavedObjectType === 'trained-model' ? modelObjectNoun : jobObjectNoun,
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
