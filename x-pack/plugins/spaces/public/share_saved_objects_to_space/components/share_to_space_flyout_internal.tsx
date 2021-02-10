/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect, useMemo } from 'react';
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
import type {
  ShareToSpaceFlyoutProps,
  ShareToSpaceSavedObjectTarget,
} from 'src/plugins/spaces_oss/public';
import { ALL_SPACES_ID, UNKNOWN_SPACE } from '../../../common/constants';
import { SpacesManager } from '../../spaces_manager';
import { ShareToSpaceTarget } from '../../types';
import { ShareToSpaceForm } from './share_to_space_form';
import { ShareOptions } from '../types';
import { CopySavedObjectsToSpaceFlyout } from '../../copy_saved_objects_to_space/components';
import { useSpaces } from '../../spaces_context';
import { DEFAULT_OBJECT_NOUN } from './constants';

const ALL_SPACES_TARGET = i18n.translate('xpack.spaces.shareToSpace.allSpacesTarget', {
  defaultMessage: 'all',
});

const arraysAreEqual = (a: unknown[], b: unknown[]) =>
  a.every((x) => b.includes(x)) && b.every((x) => a.includes(x));

function createDefaultChangeSpacesHandler(
  object: Required<Omit<ShareToSpaceSavedObjectTarget, 'icon'>>,
  spacesManager: SpacesManager,
  toastNotifications: ToastsStart
) {
  return async (spacesToAdd: string[], spacesToRemove: string[]) => {
    const { type, id, title } = object;
    const toastTitle = i18n.translate('xpack.spaces.shareToSpace.shareSuccessTitle', {
      values: { objectNoun: object.noun },
      defaultMessage: 'Updated {objectNoun}',
    });
    const isSharedToAllSpaces = spacesToAdd.includes(ALL_SPACES_ID);
    if (spacesToAdd.length > 0) {
      await spacesManager.shareSavedObjectAdd({ type, id }, spacesToAdd);
      const spaceTargets = isSharedToAllSpaces ? ALL_SPACES_TARGET : `${spacesToAdd.length}`;
      const toastText =
        !isSharedToAllSpaces && spacesToAdd.length === 1
          ? i18n.translate('xpack.spaces.shareToSpace.shareAddSuccessTextSingular', {
              defaultMessage: `'{object}' was added to 1 space.`,
              values: { object: title },
            })
          : i18n.translate('xpack.spaces.shareToSpace.shareAddSuccessTextPlural', {
              defaultMessage: `'{object}' was added to {spaceTargets} spaces.`,
              values: { object: title, spaceTargets },
            });
      toastNotifications.addSuccess({ title: toastTitle, text: toastText });
    }
    if (spacesToRemove.length > 0) {
      await spacesManager.shareSavedObjectRemove({ type, id }, spacesToRemove);
      const isUnsharedFromAllSpaces = spacesToRemove.includes(ALL_SPACES_ID);
      const spaceTargets = isUnsharedFromAllSpaces ? ALL_SPACES_TARGET : `${spacesToRemove.length}`;
      const toastText =
        !isUnsharedFromAllSpaces && spacesToRemove.length === 1
          ? i18n.translate('xpack.spaces.shareToSpace.shareRemoveSuccessTextSingular', {
              defaultMessage: `'{object}' was removed from 1 space.`,
              values: { object: title },
            })
          : i18n.translate('xpack.spaces.shareToSpace.shareRemoveSuccessTextPlural', {
              defaultMessage: `'{object}' was removed from {spaceTargets} spaces.`,
              values: { object: title, spaceTargets },
            });
      if (!isSharedToAllSpaces) {
        toastNotifications.addSuccess({ title: toastTitle, text: toastText });
      }
    }
  };
}

export const ShareToSpaceFlyoutInternal = (props: ShareToSpaceFlyoutProps) => {
  const { spacesManager, shareToSpacesDataPromise, services } = useSpaces();
  const { notifications } = services;
  const toastNotifications = notifications!.toasts;

  const { savedObjectTarget: object } = props;
  const savedObjectTarget = useMemo(
    () => ({
      type: object.type,
      id: object.id,
      namespaces: object.namespaces,
      icon: object.icon,
      title: object.title || `${object.type} [id=${object.id}]`,
      noun: object.noun || DEFAULT_OBJECT_NOUN,
    }),
    [object]
  );
  const {
    flyoutIcon,
    flyoutTitle = i18n.translate('xpack.spaces.shareToSpace.flyoutTitle', {
      defaultMessage: 'Edit spaces for {objectNoun}',
      values: { objectNoun: savedObjectTarget.noun },
    }),
    enableCreateCopyCallout = false,
    enableCreateNewSpaceLink = false,
    behaviorContext,
    changeSpacesHandler = createDefaultChangeSpacesHandler(
      savedObjectTarget,
      spacesManager,
      toastNotifications
    ),
    onUpdate = () => null,
    onClose = () => null,
  } = props;
  const enableSpaceAgnosticBehavior = behaviorContext === 'outside-space';

  const [shareOptions, setShareOptions] = useState<ShareOptions>({
    selectedSpaceIds: [],
    initiallySelectedSpaceIds: [],
  });
  const [canShareToAllSpaces, setCanShareToAllSpaces] = useState<boolean>(false);
  const [showMakeCopy, setShowMakeCopy] = useState<boolean>(false);

  const [{ isLoading, spaces }, setSpacesState] = useState<{
    isLoading: boolean;
    spaces: ShareToSpaceTarget[];
  }>({ isLoading: true, spaces: [] });
  useEffect(() => {
    const getPermissions = spacesManager.getShareSavedObjectPermissions(savedObjectTarget.type);
    Promise.all([shareToSpacesDataPromise, getPermissions])
      .then(([shareToSpacesData, permissions]) => {
        const activeSpaceId = !enableSpaceAgnosticBehavior && shareToSpacesData.activeSpaceId;
        const selectedSpaceIds = savedObjectTarget.namespaces.filter(
          (spaceId) => spaceId !== activeSpaceId
        );
        setShareOptions({
          selectedSpaceIds,
          initiallySelectedSpaceIds: selectedSpaceIds,
        });
        setCanShareToAllSpaces(permissions.shareToAllSpaces);
        setSpacesState({
          isLoading: false,
          spaces: [...shareToSpacesData.spacesMap].map(([, spaceTarget]) => spaceTarget),
        });
      })
      .catch((e) => {
        toastNotifications.addError(e, {
          title: i18n.translate('xpack.spaces.shareToSpace.spacesLoadErrorTitle', {
            defaultMessage: 'Error loading available spaces',
          }),
        });
      });
  }, [
    savedObjectTarget,
    spacesManager,
    shareToSpacesDataPromise,
    toastNotifications,
    enableSpaceAgnosticBehavior,
  ]);

  const getSelectionChanges = () => {
    if (!spaces.length) {
      return { isSelectionChanged: false, spacesToAdd: [], spacesToRemove: [] };
    }
    const activeSpaceId =
      !enableSpaceAgnosticBehavior && spaces.find((space) => space.isActiveSpace)!.id;
    const initialSelection = savedObjectTarget.namespaces.filter(
      (spaceId) => spaceId !== activeSpaceId && spaceId !== UNKNOWN_SPACE
    );
    const { selectedSpaceIds } = shareOptions;
    const filteredSelection = selectedSpaceIds.filter((x) => x !== UNKNOWN_SPACE);

    const initiallySharedToAllSpaces = initialSelection.includes(ALL_SPACES_ID);
    const selectionIncludesAllSpaces = filteredSelection.includes(ALL_SPACES_ID);

    const isSharedToAllSpaces = !initiallySharedToAllSpaces && selectionIncludesAllSpaces;
    const isUnsharedFromAllSpaces = initiallySharedToAllSpaces && !selectionIncludesAllSpaces;

    const selectedSpacesChanged =
      !selectionIncludesAllSpaces && !arraysAreEqual(initialSelection, filteredSelection);
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

    const activeSpaceArray = activeSpaceId ? [activeSpaceId] : []; // if we have an active space, it is automatically selected
    const spacesToAdd = isSharedToAllSpaces
      ? [ALL_SPACES_ID]
      : isUnsharedFromAllSpaces
      ? [...activeSpaceArray, ...selectedSpacesToAdd]
      : selectedSpacesToAdd;
    const spacesToRemove =
      isUnsharedFromAllSpaces || !isSharedToAllSpaces
        ? selectedSpacesToRemove
        : [...activeSpaceArray, ...initialSelection];
    return { isSelectionChanged, spacesToAdd, spacesToRemove };
  };
  const { isSelectionChanged, spacesToAdd, spacesToRemove } = getSelectionChanges();

  const [shareInProgress, setShareInProgress] = useState(false);

  async function startShare() {
    setShareInProgress(true);
    try {
      await changeSpacesHandler(spacesToAdd, spacesToRemove);
      onUpdate();
      onClose();
    } catch (e) {
      setShareInProgress(false);
      toastNotifications.addError(e, {
        title: i18n.translate('xpack.spaces.shareToSpace.shareErrorTitle', {
          values: { objectNoun: savedObjectTarget.noun },
          defaultMessage: 'Error updating {objectNoun}',
        }),
      });
    }
  }

  const getFlyoutBody = () => {
    // Step 1: loading assets for main form
    if (isLoading) {
      return <EuiLoadingSpinner />;
    }

    const showShareWarning =
      enableCreateCopyCallout &&
      spaces.length > 1 &&
      savedObjectTarget.namespaces.length === 1 &&
      !arraysAreEqual(savedObjectTarget.namespaces, [ALL_SPACES_ID]);
    // Step 2: Share has not been initiated yet; User must fill out form to continue.
    return (
      <ShareToSpaceForm
        spaces={spaces}
        objectNoun={savedObjectTarget.noun}
        shareOptions={shareOptions}
        onUpdate={setShareOptions}
        showShareWarning={showShareWarning}
        canShareToAllSpaces={canShareToAllSpaces}
        makeCopy={() => setShowMakeCopy(true)}
        enableCreateNewSpaceLink={enableCreateNewSpaceLink}
        enableSpaceAgnosticBehavior={enableSpaceAgnosticBehavior}
      />
    );
  };

  if (showMakeCopy) {
    return (
      <CopySavedObjectsToSpaceFlyout
        onClose={onClose}
        savedObjectTarget={savedObjectTarget}
        spacesManager={spacesManager}
        toastNotifications={toastNotifications}
      />
    );
  }

  const isStartShareButtonDisabled =
    !isSelectionChanged ||
    shareInProgress ||
    (enableSpaceAgnosticBehavior && !shareOptions.selectedSpaceIds.length); // the object must exist in at least one space, or all spaces

  return (
    <EuiFlyout onClose={onClose} maxWidth={500} data-test-subj="share-to-space-flyout">
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup alignItems="center" gutterSize="m">
          {flyoutIcon && (
            <EuiFlexItem grow={false}>
              <EuiIcon size="m" type={flyoutIcon} />
            </EuiFlexItem>
          )}
          <EuiFlexItem>
            <EuiTitle size="m">
              <h2>{flyoutTitle}</h2>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiFlexGroup alignItems="center" gutterSize="m">
          {savedObjectTarget.icon && (
            <EuiFlexItem grow={false}>
              <EuiIcon type={savedObjectTarget.icon} />
            </EuiFlexItem>
          )}
          <EuiFlexItem>
            <EuiText>
              <p>{savedObjectTarget.title}</p>
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
                id="xpack.spaces.shareToSpace.cancelButton"
                defaultMessage="Cancel"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              onClick={() => startShare()}
              data-test-subj="sts-initiate-button"
              disabled={isStartShareButtonDisabled}
            >
              <FormattedMessage
                id="xpack.spaces.shareToSpace.shareToSpacesButton"
                defaultMessage="Save &amp; close"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
