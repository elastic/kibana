/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { LayerWizard, RenderWizardArguments } from '../../layers/layer_wizard_registry';
import { NewVectorLayerEditor } from './index';
import { DocumentsLayerIcon } from '../../layers/icons/documents_layer_icon';

export const newVectorLayerWizardConfig: LayerWizard = {
  categories: [],
  description: i18n.translate('xpack.maps.newVectorLayerWizard.description', {
    defaultMessage: 'Draw points & shapes and save in Elasticsearch',
  }),
  icon: DocumentsLayerIcon,
  prerequisiteSteps: [],
  renderWizard: (renderWizardArguments: RenderWizardArguments) => {
    return <NewVectorLayerEditor {...renderWizardArguments} />;
  },
  title: i18n.translate('xpack.maps.newVectorLayerWizard.title', {
    defaultMessage: 'Draw new vector layer',
  }),
};
