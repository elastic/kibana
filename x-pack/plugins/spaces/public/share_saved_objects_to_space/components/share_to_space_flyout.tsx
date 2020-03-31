/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState, useEffect } from 'react';
import {
  EuiFlyout,
  EuiIcon,
  EuiFlyoutHeader,
  EuiTitle,
  EuiText,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiLoadingSpinner,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiEmptyPrompt,
} from '@elastic/eui';
import { mapValues } from 'lodash';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { ToastsStart } from 'src/core/public';
import {
  ProcessedImportResponse,
  processImportResponse,
} from '../../../../../../src/legacy/core_plugins/kibana/public';
import { SavedObjectsManagementRecord } from '../../../../../../src/plugins/saved_objects_management/public';
import { Space } from '../../../common/model/space';
import { SpacesManager } from '../../spaces_manager';
import { ProcessingShareToSpace } from './processing_share_to_space';
import { ShareToSpaceFlyoutFooter } from './share_to_space_flyout_footer';
import { ShareToSpaceForm } from './share_to_space_form';
import { ShareOptions, ImportRetry } from '../types';

interface Props {
  onClose: () => void;
  savedObject: SavedObjectsManagementRecord;
  spacesManager: SpacesManager;
  toastNotifications: ToastsStart;
}

export const ShareSavedObjectsToSpaceFlyout = (props: Props) => {
  const { onClose, savedObject, spacesManager, toastNotifications } = props;
  const [shareOptions, setShareOptions] = useState<ShareOptions>({
    includeRelated: true,
    overwrite: true,
    selectedSpaceIds: [],
  });

  const [{ isLoading, spaces }, setSpacesState] = useState<{ isLoading: boolean; spaces: Space[] }>(
    {
      isLoading: true,
      spaces: [],
    }
  );
  useEffect(() => {
    const getSpaces = spacesManager.getSpaces('shareSavedObjectsIntoSpace');
    const getActiveSpace = spacesManager.getActiveSpace();
    Promise.all([getSpaces, getActiveSpace])
      .then(([allSpaces, activeSpace]) => {
        setSpacesState({
          isLoading: false,
          spaces: allSpaces.filter(space => space.id !== activeSpace.id),
        });
      })
      .catch(e => {
        toastNotifications.addError(e, {
          title: i18n.translate('xpack.spaces.management.shareToSpace.spacesLoadErrorTitle', {
            defaultMessage: 'Error loading available spaces',
          }),
        });
      });
  }, [spacesManager, toastNotifications]);

  const [shareInProgress, setShareInProgress] = useState(false);
  const [conflictResolutionInProgress, setConflictResolutionInProgress] = useState(false);
  const [shareResult, setShareResult] = useState<Record<string, ProcessedImportResponse>>({});
  const [retries, setRetries] = useState<Record<string, ImportRetry[]>>({});

  const initialShareFinished = Object.values(shareResult).length > 0;

  const onRetriesChange = (updatedRetries: Record<string, ImportRetry[]>) => {
    setRetries(updatedRetries);
  };

  async function startShare() {
    setShareInProgress(true);
    setShareResult({});
    try {
      const shareSavedObjectsResult = await spacesManager.copySavedObjects(
        [
          {
            type: savedObject.type,
            id: savedObject.id,
          },
        ],
        shareOptions.selectedSpaceIds,
        shareOptions.includeRelated,
        shareOptions.overwrite
      );
      const processedResult = mapValues(shareSavedObjectsResult, processImportResponse);
      setShareResult(processedResult);
    } catch (e) {
      setShareInProgress(false);
      toastNotifications.addError(e, {
        title: i18n.translate('xpack.spaces.management.shareToSpace.shareErrorTitle', {
          defaultMessage: 'Error sharing saved object',
        }),
      });
    }
  }

  async function finishShare() {
    const needsConflictResolution = Object.values(retries).some(spaceRetry =>
      spaceRetry.some(retry => retry.overwrite)
    );

    if (needsConflictResolution) {
      setConflictResolutionInProgress(true);
      try {
        await spacesManager.resolveCopySavedObjectsErrors(
          [
            {
              type: savedObject.type,
              id: savedObject.id,
            },
          ],
          retries,
          shareOptions.includeRelated
        );

        toastNotifications.addSuccess(
          i18n.translate('xpack.spaces.management.shareToSpace.resolveShareSuccessTitle', {
            defaultMessage: 'Overwrite successful',
          })
        );

        onClose();
      } catch (e) {
        setShareInProgress(false);
        toastNotifications.addError(e, {
          title: i18n.translate('xpack.spaces.management.shareToSpace.resolveShareErrorTitle', {
            defaultMessage: 'Error resolving saved object conflicts',
          }),
        });
      }
    } else {
      onClose();
    }
  }

  const getFlyoutBody = () => {
    // Step 1: loading assets for main form
    if (isLoading) {
      return <EuiLoadingSpinner />;
    }

    // Step 1a: assets loaded, but no spaces are available for share.
    if (spaces.length === 0) {
      return (
        <EuiEmptyPrompt
          body={
            <p>
              <FormattedMessage
                id="xpack.spaces.management.shareToSpace.noSpacesBody"
                defaultMessage="There are no eligible spaces to share into."
              />
            </p>
          }
          title={
            <h3>
              <FormattedMessage
                id="xpack.spaces.management.shareToSpace.noSpacesTitle"
                defaultMessage="No spaces available"
              />
            </h3>
          }
        />
      );
    }

    // Step 2: Share has not been initiated yet; User must fill out form to continue.
    if (!shareInProgress) {
      return (
        <ShareToSpaceForm spaces={spaces} shareOptions={shareOptions} onUpdate={setShareOptions} />
      );
    }

    // Step3: Share operation is in progress
    return (
      <ProcessingShareToSpace
        savedObject={savedObject}
        shareInProgress={shareInProgress}
        conflictResolutionInProgress={conflictResolutionInProgress}
        shareResult={shareResult}
        spaces={spaces}
        shareOptions={shareOptions}
        retries={retries}
        onRetriesChange={onRetriesChange}
      />
    );
  };

  return (
    <EuiFlyout onClose={onClose} maxWidth={600} data-test-subj="share-to-space-flyout">
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup alignItems="center" gutterSize="m">
          <EuiFlexItem grow={false}>
            <EuiIcon size="m" type="share" />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiTitle size="m">
              <h2>
                <FormattedMessage
                  id="xpack.spaces.management.shareToSpaceFlyoutHeader"
                  defaultMessage="Share saved object to space"
                />
              </h2>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiFlexGroup alignItems="center" gutterSize="m">
          <EuiFlexItem grow={false}>
            <EuiIcon type={savedObject.meta.icon || 'apps'} />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText>
              <p>{savedObject.meta.title}</p>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiHorizontalRule margin="m" />

        {getFlyoutBody()}
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <ShareToSpaceFlyoutFooter
          shareInProgress={shareInProgress}
          conflictResolutionInProgress={conflictResolutionInProgress}
          initialShareFinished={initialShareFinished}
          shareResult={shareResult}
          numberOfSelectedSpaces={shareOptions.selectedSpaceIds.length}
          retries={retries}
          onShareStart={startShare}
          onShareFinish={finishShare}
        />
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
