/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/* eslint-disable @typescript-eslint/consistent-type-definitions */

import { ISource } from './sources/source';

export type PreviewSourceHandler = (source: ISource) => void;

export type RenderWizardArguments = {
  onPreviewSource: PreviewSourceHandler;
  inspectorAdapters: object;
};

export type LayerWizard = {
  description: string;
  icon: string;
  isIndexingSource?: boolean;
  renderWizard(renderWizardArguments: RenderWizardArguments): unknown;
  title: string;
};

const registry: LayerWizard[] = [];

export function registerLayerWizard(layerWizard: LayerWizard) {
  registry.push(layerWizard);
}

export function getLayerWizards(): LayerWizard[] {
  return [...registry];
}
