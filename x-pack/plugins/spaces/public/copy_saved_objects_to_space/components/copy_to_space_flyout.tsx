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
  SavedObjectsManagementRecord,
  ProcessedImportResponse,
  processImportResponse,
} from '../../../../../../src/legacy/core_plugins/management/public';
import { Space } from '../../../common/model/space';
import { SpacesManager } from '../../spaces_manager';
import { ProcessingCopyToSpace } from './processing_copy_to_space';
import { CopyToSpaceFlyoutFooter } from './copy_to_space_flyout_footer';
import { CopyToSpaceForm } from './copy_to_space_form';
import { CopyOptions, ImportRetry } from '../types';

interface Props {
  onClose: () => void;
  savedObject: SavedObjectsManagementRecord;
  spacesManager: SpacesManager;
  toastNotifications: ToastsStart;
}

export const CopySavedObjectsToSpaceFlyout = (props: Props) => {
  const { onClose, savedObject, spacesManager, toastNotifications } = props;
  const [copyOptions, setCopyOptions] = useState<CopyOptions>({
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
    const getSpaces = spacesManager.getSpaces('copySavedObjectsIntoSpace');
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
          title: i18n.translate('xpack.spaces.management.copyToSpace.spacesLoadErrorTitle', {
            defaultMessage: 'Error loading available spaces',
          }),
        });
      });
  }, [spacesManager, toastNotifications]);

  const [copyInProgress, setCopyInProgress] = useState(false);
  const [conflictResolutionInProgress, setConflictResolutionInProgress] = useState(false);
  const [copyResult, setCopyResult] = useState<Record<string, ProcessedImportResponse>>({});
  const [retries, setRetries] = useState<Record<string, ImportRetry[]>>({});

  const initialCopyFinished = Object.values(copyResult).length > 0;

  const onRetriesChange = (updatedRetries: Record<string, ImportRetry[]>) => {
    setRetries(updatedRetries);
  };

  async function startCopy() {
    setCopyInProgress(true);
    setCopyResult({});
    try {
      const copySavedObjectsResult = await spacesManager.copySavedObjects(
        [
          {
            type: savedObject.type,
            id: savedObject.id,
          },
        ],
        copyOptions.selectedSpaceIds,
        copyOptions.includeRelated,
        copyOptions.overwrite
      );
      const processedResult = mapValues(copySavedObjectsResult, processImportResponse);
      setCopyResult(processedResult);
    } catch (e) {
      setCopyInProgress(false);
      toastNotifications.addError(e, {
        title: i18n.translate('xpack.spaces.management.copyToSpace.copyErrorTitle', {
          defaultMessage: 'Error copying saved object',
        }),
      });
    }
  }

  async function finishCopy() {
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
          copyOptions.includeRelated
        );

        toastNotifications.addSuccess(
          i18n.translate('xpack.spaces.management.copyToSpace.resolveCopySuccessTitle', {
            defaultMessage: 'Overwrite successful',
          })
        );

        onClose();
      } catch (e) {
        setCopyInProgress(false);
        toastNotifications.addError(e, {
          title: i18n.translate('xpack.spaces.management.copyToSpace.resolveCopyErrorTitle', {
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

    // Step 1a: assets loaded, but no spaces are available for copy.
    if (spaces.length === 0) {
      return (
        <EuiEmptyPrompt
          body={
            <p>
              <FormattedMessage
                id="xpack.spaces.management.copyToSpace.noSpacesBody"
                defaultMessage="There are no eligible spaces to copy into."
              />
            </p>
          }
          title={
            <h3>
              <FormattedMessage
                id="xpack.spaces.management.copyToSpace.noSpacesTitle"
                defaultMessage="No spaces available"
              />
            </h3>
          }
        />
      );
    }

    // Step 2: Copy has not been initiated yet; User must fill out form to continue.
    if (!copyInProgress) {
      return (
        <CopyToSpaceForm spaces={spaces} copyOptions={copyOptions} onUpdate={setCopyOptions} />
      );
    }

    // Step3: Copy operation is in progress
    return (
      <ProcessingCopyToSpace
        savedObject={savedObject}
        copyInProgress={copyInProgress}
        conflictResolutionInProgress={conflictResolutionInProgress}
        copyResult={copyResult}
        spaces={spaces}
        copyOptions={copyOptions}
        retries={retries}
        onRetriesChange={onRetriesChange}
      />
    );
  };

  return (
    <EuiFlyout onClose={onClose} maxWidth={600} data-test-subj="copy-to-space-flyout">
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup alignItems="center" gutterSize="m">
          <EuiFlexItem grow={false}>
            <EuiIcon size="m" type="spacesApp" />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiTitle size="m">
              <h2>
                <FormattedMessage
                  id="xpack.spaces.management.copyToSpaceFlyoutHeader"
                  defaultMessage="Copy saved object to space"
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
        <CopyToSpaceFlyoutFooter
          copyInProgress={copyInProgress}
          conflictResolutionInProgress={conflictResolutionInProgress}
          initialCopyFinished={initialCopyFinished}
          copyResult={copyResult}
          numberOfSelectedSpaces={copyOptions.selectedSpaceIds.length}
          retries={retries}
          onCopyStart={startCopy}
          onCopyFinish={finishCopy}
        />
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
