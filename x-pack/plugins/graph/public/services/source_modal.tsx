/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart } from '@kbn/core/public';
import React from 'react';
import { KibanaReactOverlays } from '@kbn/kibana-react-plugin/public';
import { SavedObjectsManagementPluginStart } from '@kbn/saved-objects-management-plugin/public';
import { SourceModal } from '../components/source_modal';
import { IndexPatternSavedObject } from '../types';

export function openSourceModal(
  {
    overlays,
    http,
    uiSettings,
    savedObjectsManagement,
  }: {
    overlays: KibanaReactOverlays;
    http: CoreStart['http'];
    uiSettings: CoreStart['uiSettings'];
    savedObjectsManagement: SavedObjectsManagementPluginStart;
  },
  onSelected: (indexPattern: IndexPatternSavedObject) => void
) {
  const modalRef = overlays.openModal(
    <SourceModal
      http={http}
      uiSettings={uiSettings}
      savedObjectsManagement={savedObjectsManagement}
      onIndexPatternSelected={(indexPattern) => {
        onSelected(indexPattern);
        modalRef.close();
      }}
    />
  );
}
