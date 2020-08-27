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
  EuiButton,
  EuiButtonEmpty,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { ToastsStart } from 'src/core/public';
import { SavedObjectsManagementRecord } from '../../../../../../src/plugins/saved_objects_management/public';
import { Space } from '../../../common/model/space';
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
  const [showMakeCopy, setShowMakeCopy] = useState<boolean>(false);

  const [{ isLoading, spaces }, setSpacesState] = useState<{
    isLoading: boolean;
    spaces: SpaceTarget[];
  }>({ isLoading: true, spaces: [] });
  useEffect(() => {
    const getSpaces = spacesManager.getSpaces('shareSavedObjectsIntoSpace');
    const getActiveSpace = spacesManager.getActiveSpace();
    Promise.all([getSpaces, getActiveSpace])
      .then(([allSpaces, activeSpace]) => {
        const createSpaceTarget = (space: Space): SpaceTarget => ({
          ...space,
          isActiveSpace: space.id === activeSpace.id,
        });
        setSpacesState({
          isLoading: false,
          spaces: allSpaces.map((space) => createSpaceTarget(space)),
        });
        setShareOptions({
          selectedSpaceIds: currentNamespaces.filter((spaceId) => spaceId !== activeSpace.id),
        });
      })
      .catch((e) => {
        toastNotifications.addError(e, {
          title: i18n.translate('xpack.spaces.management.shareToSpace.spacesLoadErrorTitle', {
            defaultMessage: 'Error loading available spaces',
          }),
        });
      });
  }, [currentNamespaces, spacesManager, toastNotifications]);

  const getSelectionChanges = () => {
    const activeSpace = spaces.find((space) => space.isActiveSpace);
    if (!activeSpace) {
      return { changed: false, spacesToAdd: [], spacesToRemove: [] };
    }
    const initialSelection = currentNamespaces.filter(
      (spaceId) => spaceId !== activeSpace.id && spaceId !== '?'
    );
    const { selectedSpaceIds } = shareOptions;
    const changed = !arraysAreEqual(initialSelection, selectedSpaceIds);
    const spacesToAdd = selectedSpaceIds.filter((spaceId) => !initialSelection.includes(spaceId));
    const spacesToRemove = initialSelection.filter(
      (spaceId) => !selectedSpaceIds.includes(spaceId)
    );
    return { changed, spacesToAdd, spacesToRemove };
  };
  const { changed: isSelectionChanged, spacesToAdd, spacesToRemove } = getSelectionChanges();

  const [shareInProgress, setShareInProgress] = useState(false);

  async function startShare() {
    setShareInProgress(true);
    try {
      const { type, id, meta } = savedObject;
      const title =
        currentNamespaces.length === 1
          ? i18n.translate('xpack.spaces.management.shareToSpace.shareNewSuccessTitle', {
              defaultMessage: 'Saved Object is now shared!',
            })
          : i18n.translate('xpack.spaces.management.shareToSpace.shareEditSuccessTitle', {
              defaultMessage: 'Saved Object updated',
            });
      if (spacesToAdd.length > 0) {
        await spacesManager.shareSavedObjectAdd({ type, id }, spacesToAdd);
        const spaceNames = spacesToAdd.map(
          (spaceId) => spaces.find((space) => space.id === spaceId)!.name
        );
        const text = i18n.translate('xpack.spaces.management.shareToSpace.shareAddSuccessText', {
          defaultMessage: `'{object}' was added to the following spaces:\n{spaces}`,
          values: { object: meta.title, spaces: spaceNames.join(', ') },
        });
        toastNotifications.addSuccess({ title, text });
      }
      if (spacesToRemove.length > 0) {
        await spacesManager.shareSavedObjectRemove({ type, id }, spacesToRemove);
        const spaceNames = spacesToRemove.map(
          (spaceId) => spaces.find((space) => space.id === spaceId)!.name
        );
        const text = i18n.translate('xpack.spaces.management.shareToSpace.shareRemoveSuccessText', {
          defaultMessage: `'{object}' was removed from the following spaces:\n{spaces}`,
          values: { object: meta.title, spaces: spaceNames.join(', ') },
        });
        toastNotifications.addSuccess({ title, text });
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

    // Step 1a: assets loaded, but no spaces are available for share.
    // The `spaces` array includes the current space, so at minimum it will have a length of 1.
    if (spaces.length < 2) {
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

    const showShareWarning = currentNamespaces.length === 1;
    // Step 2: Share has not been initiated yet; User must fill out form to continue.
    return (
      <ShareToSpaceForm
        spaces={spaces}
        shareOptions={shareOptions}
        onUpdate={setShareOptions}
        showShareWarning={showShareWarning}
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
    <EuiFlyout onClose={onClose} maxWidth={460} data-test-subj="share-to-space-flyout">
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
                defaultMessage="Share"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
