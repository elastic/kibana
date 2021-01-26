/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/* eslint-disable @typescript-eslint/consistent-type-definitions */

import { ReactElement, FunctionComponent } from 'react';
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
  disabledReason?: string;
  getIsDisabled?: () => Promise<boolean> | boolean;
  icon: string | FunctionComponent<any>;
  prerequisiteSteps?: Array<{ id: string; label: string }>;
  renderWizard(renderWizardArguments: RenderWizardArguments): ReactElement<any>;
  title: string;
};

export type LayerWizardWithMeta = LayerWizard & {
  isVisible: boolean;
  isDisabled: boolean;
};

const registry: LayerWizard[] = [];

export function registerLayerWizard(layerWizard: LayerWizard) {
  registry.push({
    checkVisibility: async () => {
      return true;
    },
    getIsDisabled: async () => {
      return false;
    },
    ...layerWizard,
  });
}

export async function getLayerWizards(): Promise<LayerWizardWithMeta[]> {
  const promises = registry.map(async (layerWizard: LayerWizard) => {
    return {
      ...layerWizard,
      isVisible: await layerWizard.checkVisibility!(),
      isDisabled: await layerWizard.getIsDisabled!(),
    };
  });
  return (await Promise.all(promises)).filter(({ isVisible }) => {
    return isVisible;
  });
}
