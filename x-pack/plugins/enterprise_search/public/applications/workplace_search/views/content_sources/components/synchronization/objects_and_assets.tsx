/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiLink,
  EuiSpacer,
  EuiSwitch,
  EuiText,
} from '@elastic/eui';

import { SAVE_BUTTON_LABEL } from '../../../../../shared/constants';
import { docLinks } from '../../../../../shared/doc_links';
import { UnsavedChangesPrompt } from '../../../../../shared/unsaved_changes_prompt';
import { ViewContentHeader } from '../../../../components/shared/view_content_header';
import { NAV, RESET_BUTTON } from '../../../../constants';
import {
  LEARN_MORE_LINK,
  SYNC_MANAGEMENT_CONTENT_EXTRACTION_LABEL,
  SYNC_MANAGEMENT_THUMBNAILS_LABEL,
  SYNC_MANAGEMENT_THUMBNAILS_GLOBAL_CONFIG_LABEL,
  SOURCE_OBJECTS_AND_ASSETS_DESCRIPTION,
  SOURCE_OBJECTS_AND_ASSETS_LABEL,
  SYNC_UNSAVED_CHANGES_MESSAGE,
} from '../../constants';
import { SourceLogic } from '../../source_logic';
import { SourceLayout } from '../source_layout';

import { SynchronizationLogic } from './synchronization_logic';

export const ObjectsAndAssets: React.FC = () => {
  const { contentSource, dataLoading } = useValues(SourceLogic);
  const { thumbnailsChecked, contentExtractionChecked, hasUnsavedObjectsAndAssetsChanges } =
    useValues(SynchronizationLogic({ contentSource }));
  const {
    setThumbnailsChecked,
    setContentExtractionChecked,
    updateObjectsAndAssetsSettings,
    resetSyncSettings,
  } = useActions(SynchronizationLogic({ contentSource }));

  const { areThumbnailsConfigEnabled } = contentSource;

  const actions = (
    <EuiFlexGroup>
      <EuiFlexItem>
        <EuiButtonEmpty onClick={resetSyncSettings} disabled={!hasUnsavedObjectsAndAssetsChanges}>
          {RESET_BUTTON}
        </EuiButtonEmpty>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiButton
          fill
          onClick={updateObjectsAndAssetsSettings}
          disabled={!hasUnsavedObjectsAndAssetsChanges}
        >
          {SAVE_BUTTON_LABEL}
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  return (
    <SourceLayout
      pageChrome={[NAV.SYNCHRONIZATION_OBJECTS_AND_ASSETS]}
      pageViewTelemetry="source_synchronization"
      isLoading={dataLoading}
    >
      <UnsavedChangesPrompt
        hasUnsavedChanges={hasUnsavedObjectsAndAssetsChanges}
        messageText={SYNC_UNSAVED_CHANGES_MESSAGE}
      />
      <ViewContentHeader
        title={NAV.SYNCHRONIZATION_OBJECTS_AND_ASSETS}
        description={
          <>
            {SOURCE_OBJECTS_AND_ASSETS_DESCRIPTION}{' '}
            <EuiLink href={docLinks.workplaceSearchSynch} external>
              {LEARN_MORE_LINK}
            </EuiLink>
          </>
        }
        action={actions}
      />
      <EuiHorizontalRule />
      <EuiText size="m">{SOURCE_OBJECTS_AND_ASSETS_LABEL}</EuiText>
      <EuiSpacer />
      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <EuiSwitch
            checked={thumbnailsChecked}
            onChange={(e) => setThumbnailsChecked(e.target.checked)}
            label={
              areThumbnailsConfigEnabled
                ? SYNC_MANAGEMENT_THUMBNAILS_LABEL
                : SYNC_MANAGEMENT_THUMBNAILS_GLOBAL_CONFIG_LABEL
            }
            disabled={!areThumbnailsConfigEnabled}
            data-test-subj="ThumbnailsToggle"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <EuiSwitch
            checked={contentExtractionChecked}
            onChange={(e) => setContentExtractionChecked(e.target.checked)}
            label={SYNC_MANAGEMENT_CONTENT_EXTRACTION_LABEL}
            data-test-subj="ContentExtractionToggle"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </SourceLayout>
  );
};
