/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { KibanaReactOverlays } from '@kbn/kibana-react-plugin/public';
import { BaseSavedObjectFinderProps } from '@kbn/saved-objects-finder-plugin/public';
import { SourceModal } from '../components/source_modal';
import { IndexPatternSavedObject } from '../types';

export function openSourceModal(
  {
    overlays,
    SavedObjectFinder,
  }: {
    overlays: KibanaReactOverlays;
    SavedObjectFinder: (props: BaseSavedObjectFinderProps) => JSX.Element;
  },
  onSelected: (indexPattern: IndexPatternSavedObject) => void
) {
  const modalRef = overlays.openModal(
    <SourceModal
      SavedObjectFinder={SavedObjectFinder}
      onIndexPatternSelected={(indexPattern) => {
        onSelected(indexPattern);
        modalRef.close();
      }}
    />
  );
}
