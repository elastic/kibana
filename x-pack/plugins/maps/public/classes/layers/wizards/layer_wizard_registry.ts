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

export type LayerWizard = {
  id: string;
  title: string;
  categories: LAYER_WIZARD_CATEGORY[];
  /*
   * Sets display order.
   * Lower numbers are displayed before higher numbers.
   * 0-99 reserved for Maps-plugin wizards.
   */
  order: number;
  description: string;
  icon: string | FunctionComponent<any>;
  renderWizard(renderWizardArguments: RenderWizardArguments): ReactElement<any>;
  prerequisiteSteps?: Array<{ id: string; label: string }>;
  disabledReason?: string;
  getIsDisabled?: () => Promise<boolean> | boolean;
  isBeta?: boolean;
  checkVisibility?: () => Promise<boolean>;
  showFeatureEditTools?: boolean;
};

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

export type LayerWizardWithMeta = LayerWizard & {
  isVisible: boolean;
  isDisabled: boolean;
};

const registry: LayerWizard[] = [];

export function registerLayerWizardInternal(layerWizard: LayerWizard) {
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

export function registerLayerWizardExternal(layerWizard: LayerWizard) {
  if (layerWizard.order < 100) {
    throw new Error(`layerWizard.order should be greater than or equal to '100'`);
  }
  registerLayerWizardInternal(layerWizard);
}

export async function getLayerWizards(): Promise<LayerWizardWithMeta[]> {
  const promises = registry.map(async (layerWizard: LayerWizard) => {
    return {
      ...layerWizard,
      isVisible: await layerWizard.checkVisibility!(),
      isDisabled: await layerWizard.getIsDisabled!(),
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

export function getWizardById(wizardId: string) {
  return registry.find((wizard) => wizard.id === wizardId);
}
