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
  EuiButton,
  EuiButtonEmpty,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { ToastsStart } from 'src/core/public';
import { SavedObjectsManagementRecord } from '../../../../../../src/plugins/saved_objects_management/public';
import { GetSpaceResult } from '../../../common';
import { ALL_SPACES_ID, UNKNOWN_SPACE } from '../../../common/constants';
import { SpacesManager } from '../../spaces_manager';
import { ShareToSpaceForm } from './share_to_space_form';
import { ShareOptions, SpaceTarget } from '../types';
import { CopySavedObjectsToSpaceFlyout } from '../../copy_saved_objects_to_space/components';

interface Props {
  onClose: () => void;
  onObjectUpdated: () => void;
  savedObject: SavedObjectsManagementRecord;
  spacesManager: SpacesManager;
  toastNotifications: ToastsStart;
}

const arraysAreEqual = (a: unknown[], b: unknown[]) =>
  a.every((x) => b.includes(x)) && b.every((x) => a.includes(x));

export const ShareSavedObjectsToSpaceFlyout = (props: Props) => {
  const { onClose, onObjectUpdated, savedObject, spacesManager, toastNotifications } = props;
  const { namespaces: currentNamespaces = [] } = savedObject;
  const [shareOptions, setShareOptions] = useState<ShareOptions>({ selectedSpaceIds: [] });
  const [canShareToAllSpaces, setCanShareToAllSpaces] = useState<boolean>(false);
  const [showMakeCopy, setShowMakeCopy] = useState<boolean>(false);

  const [{ isLoading, spaces }, setSpacesState] = useState<{
    isLoading: boolean;
    spaces: SpaceTarget[];
  }>({ isLoading: true, spaces: [] });
  useEffect(() => {
    const getSpaces = spacesManager.getSpaces({ includeAuthorizedPurposes: true });
    const getActiveSpace = spacesManager.getActiveSpace();
    const getPermissions = spacesManager.getShareSavedObjectPermissions(savedObject.type);
    Promise.all([getSpaces, getActiveSpace, getPermissions])
      .then(([allSpaces, activeSpace, permissions]) => {
        setShareOptions({
          selectedSpaceIds: currentNamespaces.filter((spaceId) => spaceId !== activeSpace.id),
        });
        setCanShareToAllSpaces(permissions.shareToAllSpaces);
        const createSpaceTarget = (space: GetSpaceResult): SpaceTarget => ({
          ...space,
          isActiveSpace: space.id === activeSpace.id,
          isPartiallyAuthorized: space.authorizedPurposes?.shareSavedObjectsIntoSpace === false,
        });
        setSpacesState({
          isLoading: false,
          spaces: allSpaces.map((space) => createSpaceTarget(space)),
        });
      })
      .catch((e) => {
        toastNotifications.addError(e, {
          title: i18n.translate('xpack.spaces.management.shareToSpace.spacesLoadErrorTitle', {
            defaultMessage: 'Error loading available spaces',
          }),
        });
      });
  }, [currentNamespaces, spacesManager, savedObject, toastNotifications]);

  const getSelectionChanges = () => {
    const activeSpace = spaces.find((space) => space.isActiveSpace);
    if (!activeSpace) {
      return { isSelectionChanged: false, spacesToAdd: [], spacesToRemove: [] };
    }
    const initialSelection = currentNamespaces.filter(
      (spaceId) => spaceId !== activeSpace.id && spaceId !== UNKNOWN_SPACE
    );
    const { selectedSpaceIds } = shareOptions;
    const filteredSelection = selectedSpaceIds.filter((x) => x !== UNKNOWN_SPACE);
    const isSharedToAllSpaces =
      !initialSelection.includes(ALL_SPACES_ID) && filteredSelection.includes(ALL_SPACES_ID);
    const isUnsharedFromAllSpaces =
      initialSelection.includes(ALL_SPACES_ID) && !filteredSelection.includes(ALL_SPACES_ID);
    const selectedSpacesChanged =
      !filteredSelection.includes(ALL_SPACES_ID) &&
      !arraysAreEqual(initialSelection, filteredSelection);
    const isSelectionChanged =
      isSharedToAllSpaces ||
      isUnsharedFromAllSpaces ||
      (!isSharedToAllSpaces && !isUnsharedFromAllSpaces && selectedSpacesChanged);

    const selectedSpacesToAdd = filteredSelection.filter(
      (spaceId) => !initialSelection.includes(spaceId)
    );
    const selectedSpacesToRemove = initialSelection.filter(
      (spaceId) => !filteredSelection.includes(spaceId)
    );

    const spacesToAdd = isSharedToAllSpaces
      ? [ALL_SPACES_ID]
      : isUnsharedFromAllSpaces
      ? [activeSpace.id, ...selectedSpacesToAdd]
      : selectedSpacesToAdd;
    const spacesToRemove = isUnsharedFromAllSpaces
      ? [ALL_SPACES_ID]
      : isSharedToAllSpaces
      ? [activeSpace.id, ...initialSelection]
      : selectedSpacesToRemove;
    return { isSelectionChanged, spacesToAdd, spacesToRemove };
  };
  const { isSelectionChanged, spacesToAdd, spacesToRemove } = getSelectionChanges();

  const [shareInProgress, setShareInProgress] = useState(false);

  async function startShare() {
    setShareInProgress(true);
    try {
      const { type, id, meta } = savedObject;
      const title =
        currentNamespaces.length === 1
          ? i18n.translate('xpack.spaces.management.shareToSpace.shareNewSuccessTitle', {
              defaultMessage: 'Object is now shared',
            })
          : i18n.translate('xpack.spaces.management.shareToSpace.shareEditSuccessTitle', {
              defaultMessage: 'Object was updated',
            });
      const isSharedToAllSpaces = spacesToAdd.includes(ALL_SPACES_ID);
      if (spacesToAdd.length > 0) {
        await spacesManager.shareSavedObjectAdd({ type, id }, spacesToAdd);
        const spaceTargets = isSharedToAllSpaces ? 'all' : `${spacesToAdd.length}`;
        const text =
          !isSharedToAllSpaces && spacesToAdd.length === 1
            ? i18n.translate('xpack.spaces.management.shareToSpace.shareAddSuccessTextSingular', {
                defaultMessage: `'{object}' was added to 1 space.`,
                values: { object: meta.title },
              })
            : i18n.translate('xpack.spaces.management.shareToSpace.shareAddSuccessTextPlural', {
                defaultMessage: `'{object}' was added to {spaceTargets} spaces.`,
                values: { object: meta.title, spaceTargets },
              });
        toastNotifications.addSuccess({ title, text });
      }
      if (spacesToRemove.length > 0) {
        await spacesManager.shareSavedObjectRemove({ type, id }, spacesToRemove);
        const isUnsharedFromAllSpaces = spacesToRemove.includes(ALL_SPACES_ID);
        const spaceTargets = isUnsharedFromAllSpaces ? 'all' : `${spacesToRemove.length}`;
        const text =
          !isUnsharedFromAllSpaces && spacesToRemove.length === 1
            ? i18n.translate(
                'xpack.spaces.management.shareToSpace.shareRemoveSuccessTextSingular',
                {
                  defaultMessage: `'{object}' was removed from 1 space.`,
                  values: { object: meta.title },
                }
              )
            : i18n.translate('xpack.spaces.management.shareToSpace.shareRemoveSuccessTextPlural', {
                defaultMessage: `'{object}' was removed from {spaceTargets} spaces.`,
                values: { object: meta.title, spaceTargets },
              });
        if (!isSharedToAllSpaces) {
          toastNotifications.addSuccess({ title, text });
        }
      }
      onObjectUpdated();
      onClose();
    } catch (e) {
      setShareInProgress(false);
      toastNotifications.addError(e, {
        title: i18n.translate('xpack.spaces.management.shareToSpace.shareErrorTitle', {
          defaultMessage: 'Error updating saved object',
        }),
      });
    }
  }

  const getFlyoutBody = () => {
    // Step 1: loading assets for main form
    if (isLoading) {
      return <EuiLoadingSpinner />;
    }

    const activeSpace = spaces.find((x) => x.isActiveSpace)!;
    const showShareWarning =
      spaces.length > 1 && arraysAreEqual(currentNamespaces, [activeSpace.id]);
    // Step 2: Share has not been initiated yet; User must fill out form to continue.
    return (
      <ShareToSpaceForm
        spaces={spaces}
        shareOptions={shareOptions}
        onUpdate={setShareOptions}
        showShareWarning={showShareWarning}
        canShareToAllSpaces={canShareToAllSpaces}
        makeCopy={() => setShowMakeCopy(true)}
      />
    );
  };

  if (showMakeCopy) {
    return (
      <CopySavedObjectsToSpaceFlyout
        onClose={onClose}
        savedObject={savedObject}
        spacesManager={spacesManager}
        toastNotifications={toastNotifications}
      />
    );
  }

  return (
    <EuiFlyout onClose={onClose} maxWidth={500} data-test-subj="share-to-space-flyout">
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
                  defaultMessage="Share to space"
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
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              onClick={() => onClose()}
              data-test-subj="sts-cancel-button"
              disabled={shareInProgress}
            >
              <FormattedMessage
                id="xpack.spaces.management.shareToSpace.cancelButton"
                defaultMessage="Cancel"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              onClick={() => startShare()}
              data-test-subj="sts-initiate-button"
              disabled={!isSelectionChanged || shareInProgress}
            >
              <FormattedMessage
                id="xpack.spaces.management.shareToSpace.shareToSpacesButton"
                defaultMessage="Save &amp; close"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
