/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/consistent-type-definitions */

import { ReactElement, FunctionComponent } from 'react';
import type { LayerDescriptor } from '../../../../common/descriptor_types';
import { LAYER_WIZARD_CATEGORY } from '../../../../common/constants';

export type RenderWizardArguments = {
  previewLayers: (layerDescriptors: LayerDescriptor[]) => void;
  mapColors: string[];
  // multi-step arguments for wizards that supply 'prerequisiteSteps'
  currentStepId: string | null;
  isOnFinalStep: boolean;
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
  isBeta?: boolean;
  icon: string | FunctionComponent<any>;
  prerequisiteSteps?: Array<{ id: string; label: string }>;
  renderWizard(renderWizardArguments: RenderWizardArguments): ReactElement<any>;
  title: string;
  showFeatureEditTools?: boolean;
  order?: number;
};

export type LayerWizardWithMeta = LayerWizard & {
  isVisible: boolean;
  isDisabled: boolean;
  order: number;
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
    isBeta: false,
    ...layerWizard,
  });
}

export async function getLayerWizards(): Promise<LayerWizardWithMeta[]> {
  const promises = registry.map(async (layerWizard: LayerWizard) => {
    return {
      ...layerWizard,
      isVisible: await layerWizard.checkVisibility!(),
      isDisabled: await layerWizard.getIsDisabled!(),
      order: typeof layerWizard.order === 'number' ? layerWizard.order : 0,
    };
  });
  return (await Promise.all(promises))
    .filter(({ isVisible }) => {
      return isVisible;
    })
    .sort((wizard1: LayerWizardWithMeta, wizard2: LayerWizardWithMeta) => {
      return wizard1.order - wizard2.order;
    });
}
