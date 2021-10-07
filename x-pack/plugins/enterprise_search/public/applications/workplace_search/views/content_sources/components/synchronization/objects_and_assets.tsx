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
import { UnsavedChangesPrompt } from '../../../../../shared/unsaved_changes_prompt';
import { ViewContentHeader } from '../../../../components/shared/view_content_header';
import { NAV, RESET_BUTTON } from '../../../../constants';
import { OBJECTS_AND_ASSETS_DOCS_URL } from '../../../../routes';
import {
  SYNC_MANAGEMENT_CONTENT_EXTRACTION_LABEL,
  SYNC_MANAGEMENT_THUMBNAILS_LABEL,
  SYNC_MANAGEMENT_THUMBNAILS_GLOBAL_CONFIG_LABEL,
  SOURCE_OBJECTS_AND_ASSETS_DESCRIPTION,
  SYNC_OBJECTS_TYPES_LINK_LABEL,
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
    updateSyncSettings,
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
        <EuiButton fill onClick={updateSyncSettings} disabled={!hasUnsavedObjectsAndAssetsChanges}>
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
        description={SOURCE_OBJECTS_AND_ASSETS_DESCRIPTION}
        action={actions}
      />
      <EuiLink href={OBJECTS_AND_ASSETS_DOCS_URL} external>
        {SYNC_OBJECTS_TYPES_LINK_LABEL}
      </EuiLink>
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
