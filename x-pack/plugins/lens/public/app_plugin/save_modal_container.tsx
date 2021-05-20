/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { SaveModal } from './save_modal';
import { LensAppServices } from './types';
import { useKibana } from '../../../../../src/plugins/kibana_react/public';
import type { SaveProps } from './app';
import { Document } from '../persistence';

export interface SaveModalContainerProps {
  isVisible: boolean;
  originatingApp?: string;
  savingToLibraryPermitted: boolean;
  persistedDoc: Document;
  lastKnownDoc?: Document;
  returnToOriginSwitchLabel: string | undefined;
  onSave: (saveProps: SaveProps, options: { saveToLibrary: boolean }) => void;
  onClose: () => void;
}

// eslint-disable-next-line import/no-default-export
export default function SaveModalContainer({
  lastKnownDoc,
  returnToOriginSwitchLabel,
  onSave,
  onClose,
  isVisible,
  persistedDoc,
  originatingApp,
  savingToLibraryPermitted,
}: SaveModalContainerProps) {
  const {
    savedObjectsTagging,

    // Temporarily required until the 'by value' paradigm is default.
    dashboardFeatureFlag,
  } = useKibana<LensAppServices>().services;

  const tagsIds =
    persistedDoc && savedObjectsTagging
      ? savedObjectsTagging.ui.getTagIdsFromReferences(persistedDoc.references)
      : [];

  return (
    <SaveModal
      isVisible={isVisible}
      originatingApp={originatingApp}
      savingToLibraryPermitted={savingToLibraryPermitted}
      // allowByValueEmbeddables={dashboardFeatureFlag.allowByValueEmbeddables}
      allowByValueEmbeddables={true}
      savedObjectsTagging={savedObjectsTagging}
      tagsIds={tagsIds}
      onSave={onSave}
      onClose={onClose}
      getAppNameFromId={() => 'observability-overview'}
      lastKnownDoc={lastKnownDoc}
      returnToOriginSwitchLabel={returnToOriginSwitchLabel}
    />
  );
}
