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
  previewLayers: (layerDescriptors: LayerDescriptor[]) => void;
  mapColors: string[];
  // multi-step arguments for wizards that supply 'prerequisiteSteps'
  currentStepId: string | null;
  enableNextBtn: () => void;
  disableNextBtn: () => void;
  startStepLoading: () => void;
  stopStepLoading: () => void;
  // Typically, next step will be triggered via user clicking next button.
  // However, this method is made available to trigger next step manually
  // for async task completion that triggers the next step.
  advanceToNextStep: () => void;
};

export type LayerWizard = {
  categories: LAYER_WIZARD_CATEGORY[];
  checkVisibility?: () => Promise<boolean>;
  description: string;
  icon: string;
  prerequisiteSteps?: Array<{ id: string; label: string }>;
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
