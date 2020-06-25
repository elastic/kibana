/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/* eslint-disable @typescript-eslint/consistent-type-definitions */

import { ReactElement } from 'react';
import { LayerDescriptor } from '../../../common/descriptor_types';
import { LAYER_WIZARD_CATEGORY } from '../../../common/constants';

export type RenderWizardArguments = {
  previewLayers: (layerDescriptors: LayerDescriptor[], isIndexingSource?: boolean) => void;
  mapColors: string[];
  // upload arguments
  isIndexingTriggered: boolean;
  onRemove: () => void;
  onIndexReady: (indexReady: boolean) => void;
  importSuccessHandler: (indexResponses: unknown) => void;
  importErrorHandler: (indexResponses: unknown) => void;
};

export type LayerWizard = {
  categories: LAYER_WIZARD_CATEGORY[];
  checkVisibility?: () => Promise<boolean>;
  description: string;
  icon: string;
  isIndexingSource?: boolean;
  renderWizard(renderWizardArguments: RenderWizardArguments): ReactElement<any>;
  title: string;
};

const registry: LayerWizard[] = [];

export function registerLayerWizard(layerWizard: LayerWizard) {
  registry.push({
    checkVisibility: async () => {
      return true;
    },
    ...layerWizard,
  });
}

export async function getLayerWizards(): Promise<LayerWizard[]> {
  const promises = registry.map(async (layerWizard) => {
    return {
      ...layerWizard,
      // @ts-ignore
      isVisible: await layerWizard.checkVisibility(),
    };
  });
  return (await Promise.all(promises)).filter(({ isVisible }) => {
    return isVisible;
  });
}
