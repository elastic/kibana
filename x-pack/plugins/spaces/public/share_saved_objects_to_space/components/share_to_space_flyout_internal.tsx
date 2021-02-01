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
import { useKibana } from '../../../../../../src/plugins/kibana_react/public';
import { GetSpaceResult } from '../../../common';
import { ALL_SPACES_ID, UNKNOWN_SPACE } from '../../../common/constants';
import { SpacesManager } from '../../spaces_manager';
import { ShareToSpaceForm } from './share_to_space_form';
import { ShareOptions, SpaceTarget } from '../types';
import { CopySavedObjectsToSpaceFlyout } from '../../copy_saved_objects_to_space/components';

interface InternalProps extends ShareToSpaceFlyoutProps {
  spacesManager: SpacesManager;
}

const DEFAULT_FLYOUT_ICON = 'share';
const DEFAULT_OBJECT_ICON = 'empty';
const DEFAULT_OBJECT_NOUN = i18n.translate('xpack.spaces.management.shareToSpace.objectNoun', {
  defaultMessage: 'object',
});

const arraysAreEqual = (a: unknown[], b: unknown[]) =>
  a.every((x) => b.includes(x)) && b.every((x) => a.includes(x));

function createDefaultChangeSpacesHandler(
  object: Required<ShareToSpaceSavedObjectTarget>,
  spacesManager: SpacesManager,
  toastNotifications: ToastsStart
) {
  return async (spacesToAdd: string[], spacesToRemove: string[]) => {
    const { type, id, title } = object;
    const toastTitle = i18n.translate('xpack.spaces.management.shareToSpace.shareSuccessTitle', {
      values: { objectNoun: object.noun },
      defaultMessage: 'Updated {objectNoun}',
    });
    const isSharedToAllSpaces = spacesToAdd.includes(ALL_SPACES_ID);
    if (spacesToAdd.length > 0) {
      await spacesManager.shareSavedObjectAdd({ type, id }, spacesToAdd);
      const spaceTargets = isSharedToAllSpaces ? 'all' : `${spacesToAdd.length}`;
      const toastText =
        !isSharedToAllSpaces && spacesToAdd.length === 1
          ? i18n.translate('xpack.spaces.management.shareToSpace.shareAddSuccessTextSingular', {
              defaultMessage: `'{object}' was added to 1 space.`,
              values: { object: title },
            })
          : i18n.translate('xpack.spaces.management.shareToSpace.shareAddSuccessTextPlural', {
              defaultMessage: `'{object}' was added to {spaceTargets} spaces.`,
              values: { object: title, spaceTargets },
            });
      toastNotifications.addSuccess({ title: toastTitle, text: toastText });
    }
    if (spacesToRemove.length > 0) {
      await spacesManager.shareSavedObjectRemove({ type, id }, spacesToRemove);
      const isUnsharedFromAllSpaces = spacesToRemove.includes(ALL_SPACES_ID);
      const spaceTargets = isUnsharedFromAllSpaces ? 'all' : `${spacesToRemove.length}`;
      const toastText =
        !isUnsharedFromAllSpaces && spacesToRemove.length === 1
          ? i18n.translate('xpack.spaces.management.shareToSpace.shareRemoveSuccessTextSingular', {
              defaultMessage: `'{object}' was removed from 1 space.`,
              values: { object: title },
            })
          : i18n.translate('xpack.spaces.management.shareToSpace.shareRemoveSuccessTextPlural', {
              defaultMessage: `'{object}' was removed from {spaceTargets} spaces.`,
              values: { object: title, spaceTargets },
            });
      if (!isSharedToAllSpaces) {
        toastNotifications.addSuccess({ title: toastTitle, text: toastText });
      }
    }
  };
}

export const ShareToSpaceFlyoutInternal = (props: InternalProps) => {
  const { services } = useKibana();
  const { notifications } = services;
  const toastNotifications = notifications!.toasts;

  const { savedObjectTarget: object, spacesManager } = props;
  const savedObjectTarget = useMemo(
    () => ({
      type: object.type,
      id: object.id,
      namespaces: object.namespaces,
      icon: object.icon || DEFAULT_OBJECT_ICON,
      title: object.title || `${object.type} [id=${object.id}]`,
      noun: object.noun || DEFAULT_OBJECT_NOUN,
    }),
    [object]
  );
  const {
    flyoutIcon = DEFAULT_FLYOUT_ICON,
    flyoutTitle = i18n.translate('xpack.spaces.management.shareToSpace.flyoutTitle', {
      defaultMessage: 'Edit spaces for {objectNoun}',
      values: { objectNoun: savedObjectTarget.noun },
    }),
    enableCreateCopyCallout = false,
    enableCreateNewSpaceLink = false,
    changeSpacesHandler = createDefaultChangeSpacesHandler(
      savedObjectTarget,
      spacesManager,
      toastNotifications
    ),
    onUpdate = () => null,
    onClose = () => null,
  } = props;

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
    const getPermissions = spacesManager.getShareSavedObjectPermissions(savedObjectTarget.type);
    Promise.all([getSpaces, getActiveSpace, getPermissions])
      .then(([allSpaces, activeSpace, permissions]) => {
        setShareOptions({
          selectedSpaceIds: savedObjectTarget.namespaces.filter(
            (spaceId) => spaceId !== activeSpace.id
          ),
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
  }, [savedObjectTarget, spacesManager, toastNotifications]);

  const getSelectionChanges = () => {
    const activeSpace = spaces.find((space) => space.isActiveSpace);
    if (!activeSpace) {
      return { isSelectionChanged: false, spacesToAdd: [], spacesToRemove: [] };
    }
    const initialSelection = savedObjectTarget.namespaces.filter(
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
      await changeSpacesHandler(spacesToAdd, spacesToRemove);
      onUpdate();
      onClose();
    } catch (e) {
      setShareInProgress(false);
      toastNotifications.addError(e, {
        title: i18n.translate('xpack.spaces.management.shareToSpace.shareErrorTitle', {
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

    const activeSpace = spaces.find((x) => x.isActiveSpace)!;
    const showShareWarning =
      enableCreateCopyCallout &&
      spaces.length > 1 &&
      arraysAreEqual(savedObjectTarget.namespaces, [activeSpace.id]);
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

  return (
    <EuiFlyout onClose={onClose} maxWidth={500} data-test-subj="share-to-space-flyout">
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup alignItems="center" gutterSize="m">
          <EuiFlexItem grow={false}>
            <EuiIcon size="m" type={flyoutIcon} />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiTitle size="m">
              <h2>{flyoutTitle}</h2>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiFlexGroup alignItems="center" gutterSize="m">
          <EuiFlexItem grow={false}>
            <EuiIcon type={savedObjectTarget.icon} />
          </EuiFlexItem>
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
