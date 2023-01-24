/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import type { SavedObjectTaggingPluginStart } from '@kbn/saved-objects-tagging-plugin/public';

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
  savingToLibraryPermitted?: boolean;

  originatingApp?: string;
  allowByValueEmbeddables: boolean;

  savedObjectsTagging?: SavedObjectTaggingPluginStart;
  tagsIds: string[];

  title?: string;
  savedObjectId?: string;
  description?: string;

  getAppNameFromId: () => string | undefined;
  returnToOriginSwitchLabel?: string;

  onClose: () => void;
  onSave: (props: SaveProps, options: { saveToLibrary: boolean }) => void;
}

export const SaveModal = (props: Props) => {
  const {
    originatingApp,
    savingToLibraryPermitted,
    savedObjectsTagging,
    tagsIds,
    savedObjectId,
    title,
    description,
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
          id: savedObjectId,
          title: title || '',
          description: description || '',
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
      initialTags={tagsIds}
      canSaveByReference={Boolean(savingToLibraryPermitted)}
      onSave={(saveProps) => {
        const saveToLibrary = Boolean(saveProps.addToLibrary);
        onSave(saveProps, { saveToLibrary });
      }}
      onClose={onClose}
      documentInfo={{
        // if the user cannot save to the library - treat this as a new document.
        id: savingToLibraryPermitted ? savedObjectId : undefined,
        title: title || '',
        description: description || '',
      }}
      objectType={i18n.translate('xpack.lens.app.saveModalType', {
        defaultMessage: 'Lens visualization',
      })}
      data-test-subj="lnsApp_saveModalDashboard"
    />
  );
};
