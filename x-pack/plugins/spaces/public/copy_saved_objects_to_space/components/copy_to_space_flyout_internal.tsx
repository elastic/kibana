/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiHorizontalRule,
  EuiIcon,
  EuiLoadingSpinner,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { mapValues } from 'lodash';
import React, { useEffect, useMemo, useState } from 'react';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { useSpaces } from '../../spaces_context';
import type { SpacesDataEntry } from '../../types';
import { processImportResponse } from '../lib';
import type { ProcessedImportResponse } from '../lib';
import type { CopyOptions, CopyToSpaceFlyoutProps, ImportRetry } from '../types';
import { CopyToSpaceFlyoutFooter } from './copy_to_space_flyout_footer';
import { CopyToSpaceForm } from './copy_to_space_form';
import { ProcessingCopyToSpace } from './processing_copy_to_space';

const INCLUDE_RELATED_DEFAULT = true;
const CREATE_NEW_COPIES_DEFAULT = true;
const OVERWRITE_ALL_DEFAULT = true;

export const CopyToSpaceFlyoutInternal = (props: CopyToSpaceFlyoutProps) => {
  const { spacesManager, spacesDataPromise, services } = useSpaces();
  const { notifications } = services;
  const toastNotifications = notifications!.toasts;

  const { onClose = () => null, savedObjectTarget: object } = props;
  const savedObjectTarget = useMemo(
    () => ({
      type: object.type,
      id: object.id,
      namespaces: object.namespaces,
      icon: object.icon || 'apps',
      title: object.title || `${object.type} [id=${object.id}]`,
    }),
    [object]
  );
  const [copyOptions, setCopyOptions] = useState<CopyOptions>({
    includeRelated: INCLUDE_RELATED_DEFAULT,
    createNewCopies: CREATE_NEW_COPIES_DEFAULT,
    overwrite: OVERWRITE_ALL_DEFAULT,
    selectedSpaceIds: [],
  });

  const [{ isLoading, spaces }, setSpacesState] = useState<{
    isLoading: boolean;
    spaces: SpacesDataEntry[];
  }>({
    isLoading: true,
    spaces: [],
  });
  useEffect(() => {
    spacesDataPromise
      .then(({ spacesMap }) => {
        setSpacesState({
          isLoading: false,
          spaces: [...spacesMap.values()].filter(
            ({ isActiveSpace, isAuthorizedForPurpose }) =>
              !isActiveSpace && isAuthorizedForPurpose('copySavedObjectsIntoSpace')
          ),
        });
      })
      .catch((e) => {
        toastNotifications.addError(e, {
          title: i18n.translate('xpack.spaces.management.copyToSpace.spacesLoadErrorTitle', {
            defaultMessage: 'Error loading available spaces',
          }),
        });
      });
  }, [spacesDataPromise, toastNotifications]);

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
        [{ type: savedObjectTarget.type, id: savedObjectTarget.id }],
        copyOptions.selectedSpaceIds,
        copyOptions.includeRelated,
        copyOptions.createNewCopies,
        copyOptions.overwrite
      );
      const processedResult = mapValues(copySavedObjectsResult, processImportResponse);
      setCopyResult(processedResult);

      // retry all successful imports
      const getAutomaticRetries = (response: ProcessedImportResponse): ImportRetry[] => {
        const { failedImports, successfulImports } = response;
        if (!failedImports.length) {
          // if no imports failed for this space, return an empty array
          return [];
        }

        // get missing references failures that do not also have a conflict
        const nonMissingReferencesFailures = failedImports
          .filter(({ error }) => error.type !== 'missing_references')
          .reduce((acc, { obj: { type, id } }) => acc.add(`${type}:${id}`), new Set<string>());
        const missingReferencesToRetry = failedImports.filter(
          ({ obj: { type, id }, error }) =>
            error.type === 'missing_references' &&
            !nonMissingReferencesFailures.has(`${type}:${id}`)
        );

        // otherwise, some imports failed for this space, so retry any successful imports (if any)
        return [
          ...successfulImports.map(({ type, id, overwrite, destinationId, createNewCopy }) => {
            return { type, id, overwrite: overwrite === true, destinationId, createNewCopy };
          }),
          ...missingReferencesToRetry.map(({ obj: { type, id } }) => ({
            type,
            id,
            overwrite: false,
            ignoreMissingReferences: true,
          })),
        ];
      };
      const automaticRetries = mapValues(processedResult, getAutomaticRetries);
      setRetries(automaticRetries);
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
    // if any retries are present, attempt to resolve errors again
    const needsErrorResolution = Object.values(retries).some((spaceRetry) => spaceRetry.length);

    if (needsErrorResolution) {
      setConflictResolutionInProgress(true);
      try {
        await spacesManager.resolveCopySavedObjectsErrors(
          [{ type: savedObjectTarget.type, id: savedObjectTarget.id }],
          retries,
          copyOptions.includeRelated,
          copyOptions.createNewCopies
        );

        toastNotifications.addSuccess(
          i18n.translate('xpack.spaces.management.copyToSpace.resolveCopySuccessTitle', {
            defaultMessage: 'Copy successful',
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
        <CopyToSpaceForm
          savedObjectTarget={savedObjectTarget}
          spaces={spaces}
          copyOptions={copyOptions}
          onUpdate={setCopyOptions}
        />
      );
    }

    // Step3: Copy operation is in progress
    return (
      <ProcessingCopyToSpace
        savedObjectTarget={savedObjectTarget}
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
            <EuiIcon size="m" type="copy" />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiTitle size="m">
              <h2>
                <FormattedMessage
                  id="xpack.spaces.management.copyToSpaceFlyoutHeader"
                  defaultMessage="Copy to space"
                />
              </h2>
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
        <CopyToSpaceFlyoutFooter
          copyInProgress={copyInProgress}
          conflictResolutionInProgress={conflictResolutionInProgress}
          initialCopyFinished={initialCopyFinished}
          copyResult={copyResult}
          numberOfSelectedSpaces={copyOptions.selectedSpaceIds.length}
          retries={retries}
          onClose={onClose}
          onCopyStart={startCopy}
          onCopyFinish={finishCopy}
        />
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
