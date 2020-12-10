/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';

import { SavedObjectsStart } from '../../../../../src/core/public';

import { Document } from '../persistence';
import type { SavedObjectTaggingPluginStart } from '../../../saved_objects_tagging/public';

import {
  TagEnhancedSavedObjectSaveModalOrigin,
  OriginSaveProps,
} from './tags_saved_object_save_modal_origin_wrapper';
import {
  TagEnhancedSavedObjectSaveModalDashboard,
  DashboardSaveProps,
} from './tags_saved_object_save_modal_dashboard_wrapper';

export type SaveProps = OriginSaveProps | DashboardSaveProps;

export interface Props {
  isVisible: boolean;

  originatingApp?: string;
  allowByValueEmbeddables: boolean;

  savedObjectsClient: SavedObjectsStart['client'];

  savedObjectsTagging?: SavedObjectTaggingPluginStart;
  tagsIds: string[];

  lastKnownDoc?: Document;

  getAppNameFromId: () => string | undefined;
  returnToOriginSwitchLabel?: string;

  onClose: () => void;
  onSave: (props: SaveProps, options: { saveToLibrary: boolean }) => void;
}

export const SaveModal = (props: Props) => {
  if (!props.isVisible || !props.lastKnownDoc) {
    return null;
  }

  const {
    originatingApp,
    savedObjectsTagging,
    savedObjectsClient,
    tagsIds,
    lastKnownDoc,
    allowByValueEmbeddables,
    returnToOriginSwitchLabel,
    getAppNameFromId,
    onClose,
    onSave,
  } = props;

  // Use the modal with return-to-origin features if we're in an app's edit flow or if by-value embeddables are disabled
  if (originatingApp || !allowByValueEmbeddables) {
    return (
      <TagEnhancedSavedObjectSaveModalOrigin
        savedObjectsTagging={savedObjectsTagging}
        initialTags={tagsIds}
        originatingApp={originatingApp}
        onClose={onClose}
        onSave={(saveProps) => onSave(saveProps, { saveToLibrary: true })}
        getAppNameFromId={getAppNameFromId}
        documentInfo={{
          id: lastKnownDoc.savedObjectId,
          title: lastKnownDoc.title || '',
          description: lastKnownDoc.description || '',
        }}
        returnToOriginSwitchLabel={returnToOriginSwitchLabel}
        objectType={i18n.translate('xpack.lens.app.saveModalType', {
          defaultMessage: 'Lens visualization',
        })}
        data-test-subj="lnsApp_saveModalOrigin"
      />
    );
  }

  return (
    <TagEnhancedSavedObjectSaveModalDashboard
      savedObjectsTagging={savedObjectsTagging}
      savedObjectsClient={savedObjectsClient}
      initialTags={tagsIds}
      onSave={(saveProps) => onSave(saveProps, { saveToLibrary: false })}
      onClose={onClose}
      documentInfo={{
        id: lastKnownDoc.savedObjectId,
        title: lastKnownDoc.title || '',
        description: lastKnownDoc.description || '',
      }}
      objectType={i18n.translate('xpack.lens.app.saveModalType', {
        defaultMessage: 'Lens visualization',
      })}
      data-test-subj="lnsApp_saveModalDashboard"
    />
  );
};
