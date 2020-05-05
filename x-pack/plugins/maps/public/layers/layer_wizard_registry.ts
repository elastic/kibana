/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/* eslint-disable @typescript-eslint/consistent-type-definitions */

import { ReactElement } from 'react';
import { LayerDescriptor } from '../../common/descriptor_types';

export type RenderWizardArguments = {
  previewLayer: (layerDescriptor: LayerDescriptor | null, isIndexingSource?: boolean) => void;
  mapColors: string[];
  // upload arguments
  isIndexingTriggered: boolean;
  onRemove: () => void;
  onIndexReady: () => void;
  importSuccessHandler: (indexResponses: unknown) => void;
  importErrorHandler: (indexResponses: unknown) => void;
};

export type LayerWizard = {
  checkVisibility?: () => boolean;
  description: string;
  icon: string;
  isIndexingSource?: boolean;
  renderWizard(renderWizardArguments: RenderWizardArguments): ReactElement<any>;
  title: string;
};

const registry: LayerWizard[] = [];

export function registerLayerWizard(layerWizard: LayerWizard) {
  registry.push(layerWizard);
}

export function getLayerWizards(): LayerWizard[] {
  return registry.filter(layerWizard => {
    return layerWizard.checkVisibility ? layerWizard.checkVisibility() : true;
  });
}
