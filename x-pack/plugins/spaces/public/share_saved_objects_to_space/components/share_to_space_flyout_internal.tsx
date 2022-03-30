/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './share_to_space_flyout_internal.scss';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiIcon,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import React, { lazy, Suspense, useEffect, useMemo, useState } from 'react';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { SavedObjectReferenceWithContext, ToastsStart } from 'src/core/public';

import { ALL_SPACES_ID, UNKNOWN_SPACE } from '../../../common/constants';
import { DEFAULT_OBJECT_NOUN } from '../../constants';
import { getCopyToSpaceFlyoutComponent } from '../../copy_saved_objects_to_space';
import { useSpaces } from '../../spaces_context';
import type { SpacesManager } from '../../spaces_manager';
import type { SpacesDataEntry } from '../../types';
import type {
  ShareOptions,
  ShareToSpaceFlyoutProps,
  ShareToSpaceSavedObjectTarget,
} from '../types';
import { AliasTable } from './alias_table';
import { RelativesFooter } from './relatives_footer';
import { ShareToSpaceForm } from './share_to_space_form';
import type { InternalLegacyUrlAliasTarget } from './types';

// No need to wrap LazyCopyToSpaceFlyout in an error boundary, because the ShareToSpaceFlyoutInternal component itself is only ever used in
// a lazy-loaded fashion with an error boundary.
const LazyCopyToSpaceFlyout = lazy(() =>
  getCopyToSpaceFlyoutComponent().then((component) => ({ default: component }))
);

const ALL_SPACES_TARGET = i18n.translate('xpack.spaces.shareToSpace.allSpacesTarget', {
  defaultMessage: 'all spaces',
});
function getSpacesTargetString(spaces: string[]) {
  if (spaces.includes(ALL_SPACES_ID)) {
    return ALL_SPACES_TARGET;
  }
  return i18n.translate('xpack.spaces.shareToSpace.spacesTarget', {
    defaultMessage: '{spacesCount, plural, one {# space} other {# spaces}}',
    values: { spacesCount: spaces.length },
  });
}

const arraysAreEqual = (a: unknown[], b: unknown[]) =>
  a.every((x) => b.includes(x)) && b.every((x) => a.includes(x));

function createDefaultChangeSpacesHandler(
  object: Required<Omit<ShareToSpaceSavedObjectTarget, 'icon'>>,
  spacesManager: SpacesManager,
  toastNotifications: ToastsStart
) {
  return async (
    objects: Array<{ type: string; id: string }>,
    spacesToAdd: string[],
    spacesToRemove: string[]
  ) => {
    const { title } = object;
    const objectsToUpdate = objects.map(({ type, id }) => ({ type, id })); // only use 'type' and 'id' fields
    const relativesCount = objects.length - 1;
    const toastTitle = i18n.translate('xpack.spaces.shareToSpace.shareSuccessTitle', {
      values: { objectNoun: object.noun },
      defaultMessage: 'Updated {objectNoun}',
      description: `Object noun can be plural or singular, examples: "Updated objects", "Updated job"`,
    });
    await spacesManager.updateSavedObjectsSpaces(objectsToUpdate, spacesToAdd, spacesToRemove);

    const isSharedToAllSpaces = spacesToAdd.includes(ALL_SPACES_ID);
    let toastText: string;
    if (spacesToAdd.length > 0 && spacesToRemove.length > 0 && !isSharedToAllSpaces) {
      toastText = i18n.translate('xpack.spaces.shareToSpace.shareSuccessAddRemoveText', {
        defaultMessage: `'{object}' {relativesCount, plural, =0 {was} =1 {and {relativesCount} related object were} other {and {relativesCount} related objects were}} added to {spacesTargetAdd} and removed from {spacesTargetRemove}.`,
        values: {
          object: title,
          relativesCount,
          spacesTargetAdd: getSpacesTargetString(spacesToAdd),
          spacesTargetRemove: getSpacesTargetString(spacesToRemove),
        },
        description: `Uses output of xpack.spaces.shareToSpace.spacesTarget or xpack.spaces.shareToSpace.allSpacesTarget as 'spacesTarget...' inputs. Example strings: "'Finance dashboard' was added to 1 space and removed from 2 spaces.", "'Finance dashboard' and 2 related objects were added to 3 spaces and removed from all spaces."`,
      });
    } else if (spacesToAdd.length > 0) {
      toastText = i18n.translate('xpack.spaces.shareToSpace.shareSuccessAddText', {
        defaultMessage: `'{object}' {relativesCount, plural, =0 {was} =1 {and {relativesCount} related object were} other {and {relativesCount} related objects were}} added to {spacesTarget}.`,
        values: {
          object: title,
          relativesCount,
          spacesTarget: getSpacesTargetString(spacesToAdd),
        },
        description: `Uses output of xpack.spaces.shareToSpace.spacesTarget or xpack.spaces.shareToSpace.allSpacesTarget as 'spacesTarget' input. Example strings: "'Finance dashboard' was added to 1 space.", "'Finance dashboard' and 2 related objects were added to all spaces."`,
      });
    } else {
      toastText = i18n.translate('xpack.spaces.shareToSpace.shareSuccessRemoveText', {
        defaultMessage: `'{object}' {relativesCount, plural, =0 {was} =1 {and {relativesCount} related object were} other {and {relativesCount} related objects were}} removed from {spacesTarget}.`,
        values: {
          object: title,
          relativesCount,
          spacesTarget: getSpacesTargetString(spacesToRemove),
        },
        description: `Uses output of xpack.spaces.shareToSpace.spacesTarget or xpack.spaces.shareToSpace.allSpacesTarget as 'spacesTarget' input. Example strings: "'Finance dashboard' was removed from 1 space.", "'Finance dashboard' and 2 related objects were removed from all spaces."`,
      });
    }
    toastNotifications.addSuccess({ title: toastTitle, text: toastText });
  };
}

export const ShareToSpaceFlyoutInternal = (props: ShareToSpaceFlyoutProps) => {
  const { spacesManager, spacesDataPromise, services } = useSpaces();
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
      defaultMessage: 'Assign {objectNoun} to spaces',
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

  const [{ isLoading, spaces, referenceGraph, aliasTargets }, setSpacesState] = useState<{
    isLoading: boolean;
    spaces: SpacesDataEntry[];
    referenceGraph: SavedObjectReferenceWithContext[];
    aliasTargets: InternalLegacyUrlAliasTarget[];
  }>({ isLoading: true, spaces: [], referenceGraph: [], aliasTargets: [] });
  useEffect(() => {
    const { type, id } = savedObjectTarget;
    const getShareableReferences = spacesManager.getShareableReferences([{ type, id }]);
    const getPermissions = spacesManager.getShareSavedObjectPermissions(type);
    Promise.all([spacesDataPromise, getShareableReferences, getPermissions])
      .then(([spacesData, shareableReferences, permissions]) => {
        const activeSpaceId = !enableSpaceAgnosticBehavior && spacesData.activeSpaceId;
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
          spaces: [...spacesData.spacesMap].map(([, spaceTarget]) => spaceTarget),
          referenceGraph: shareableReferences.objects,
          aliasTargets: shareableReferences.objects.reduce<InternalLegacyUrlAliasTarget[]>(
            (acc, x) => {
              for (const space of x.spacesWithMatchingAliases ?? []) {
                if (space !== '?') {
                  const spaceExists = spacesData.spacesMap.has(space);
                  // If the user does not have privileges to view all spaces, they will be redacted; we cannot attempt to disable aliases for redacted spaces.
                  acc.push({ targetSpace: space, targetType: x.type, sourceId: x.id, spaceExists });
                }
              }
              return acc;
            },
            []
          ),
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
    spacesDataPromise,
    toastNotifications,
    enableSpaceAgnosticBehavior,
  ]);

  const getSelectionChanges = () => {
    if (!spaces.length) {
      return {
        isSelectionChanged: false,
        spacesToAdd: [],
        spacesToRemove: [],
        aliasesToDisable: [],
      };
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
    const spacesToAddSet = new Set(spacesToAdd);
    const spacesToRemove =
      isUnsharedFromAllSpaces || !isSharedToAllSpaces
        ? selectedSpacesToRemove
        : [...activeSpaceArray, ...initialSelection];
    const aliasesToDisable = isSharedToAllSpaces
      ? aliasTargets
      : aliasTargets.filter(({ targetSpace }) => spacesToAddSet.has(targetSpace));
    return { isSelectionChanged, spacesToAdd, spacesToRemove, aliasesToDisable };
  };
  const { isSelectionChanged, spacesToAdd, spacesToRemove, aliasesToDisable } =
    getSelectionChanges();

  const [showAliasesToDisable, setShowAliasesToDisable] = useState(false);
  const [shareInProgress, setShareInProgress] = useState(false);

  async function startShare() {
    setShareInProgress(true);
    try {
      if (aliasesToDisable.length) {
        const aliases = aliasesToDisable.map(({ spaceExists, ...alias }) => alias); // only use 'targetSpace', 'targetType', and 'sourceId' fields
        await spacesManager.disableLegacyUrlAliases(aliases);
      }
      await changeSpacesHandler(referenceGraph, spacesToAdd, spacesToRemove);
      const updatedObjects = referenceGraph.map(({ type, id }) => ({ type, id })); // only use 'type' and 'id' fields
      onUpdate(updatedObjects);
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

    if (!showAliasesToDisable) {
      // If the object has not been shared yet (e.g., it currently exists in exactly one space), and there is at least one space that we could
      // share this object to, we want to display a callout to the user that explains the ramifications of shared objects. They might actually
      // want to make a copy instead, so this callout contains a link that opens the Copy flyout.
      const showCreateCopyCallout =
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
          showCreateCopyCallout={showCreateCopyCallout}
          canShareToAllSpaces={canShareToAllSpaces}
          makeCopy={() => setShowMakeCopy(true)}
          enableCreateNewSpaceLink={enableCreateNewSpaceLink}
          enableSpaceAgnosticBehavior={enableSpaceAgnosticBehavior}
        />
      );
    }

    return <AliasTable spaces={spaces} aliasesToDisable={aliasesToDisable} />;
  };

  const getFlyoutFooter = () => {
    const filteredAliasesToDisable = aliasesToDisable.filter(({ spaceExists }) => spaceExists);
    const showContinueButton = filteredAliasesToDisable.length && !showAliasesToDisable;
    return (
      <>
        <RelativesFooter
          savedObjectTarget={savedObjectTarget}
          referenceGraph={referenceGraph}
          isDisabled={isStartShareButtonDisabled}
        />
        <EuiFlexGroup justifyContent="spaceBetween" responsive={false}>
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
            {showContinueButton ? (
              <EuiButton
                fill
                onClick={() => setShowAliasesToDisable(true)}
                data-test-subj="sts-continue-button"
                disabled={isStartShareButtonDisabled}
              >
                <FormattedMessage
                  id="xpack.spaces.shareToSpace.continueButton"
                  defaultMessage="Continue"
                />
              </EuiButton>
            ) : (
              <EuiButton
                fill
                onClick={() => startShare()}
                data-test-subj="sts-save-button"
                disabled={isStartShareButtonDisabled}
              >
                <FormattedMessage
                  id="xpack.spaces.shareToSpace.saveButton"
                  defaultMessage="Save &amp; close"
                />
              </EuiButton>
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </>
    );
  };

  if (showMakeCopy) {
    return (
      <Suspense fallback={<EuiLoadingSpinner />}>
        <LazyCopyToSpaceFlyout onClose={onClose} savedObjectTarget={savedObjectTarget} />
      </Suspense>
    );
  }

  const isStartShareButtonDisabled =
    !isSelectionChanged ||
    shareInProgress ||
    (enableSpaceAgnosticBehavior && !shareOptions.selectedSpaceIds.length); // the object must exist in at least one space, or all spaces

  return (
    <EuiFlyout onClose={onClose} maxWidth={500} data-test-subj="share-to-space-flyout">
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
          {flyoutIcon && (
            <EuiFlexItem grow={false}>
              <EuiIcon size="l" type={flyoutIcon} />
            </EuiFlexItem>
          )}
          <EuiFlexItem>
            <EuiTitle size="m">
              <h2>{flyoutTitle}</h2>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>

      <EuiFlexGroup
        direction="column"
        gutterSize="none"
        className="spcShareToSpace__flyoutBodyWrapper"
        responsive={false}
      >
        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
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
        </EuiFlexItem>

        <EuiSpacer size="m" />

        {getFlyoutBody()}
      </EuiFlexGroup>

      <EuiFlyoutFooter>{getFlyoutFooter()}</EuiFlyoutFooter>
    </EuiFlyout>
  );
};
