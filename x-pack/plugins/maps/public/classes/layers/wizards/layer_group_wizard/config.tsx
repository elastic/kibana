/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { LayerWizard, RenderWizardArguments } from '../layer_wizard_registry';
import { LayerGroupWizard } from './wizard';
import { WIZARD_ID } from '../../../../../common/constants';

export const layerGroupWizardConfig: LayerWizard = {
  id: WIZARD_ID.LAYER_GROUP,
  order: 10,
  categories: [],
  description: i18n.translate('xpack.maps.layerGroupWizard.description', {
    defaultMessage: 'Organize related layers in a hierarchy',
  }),
  icon: 'layers',
  renderWizard: (renderWizardArguments: RenderWizardArguments) => {
    return <LayerGroupWizard {...renderWizardArguments} />;
  },
  title: i18n.translate('xpack.maps.layerGroupWizard.title', {
    defaultMessage: 'Layer group',
  }),
};
