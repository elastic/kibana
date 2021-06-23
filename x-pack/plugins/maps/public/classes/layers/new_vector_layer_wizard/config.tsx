/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { LayerWizard, RenderWizardArguments } from '../../layers/layer_wizard_registry';
import { NewVectorLayerEditor } from './wizard';
import { DrawLayerIcon } from '../../layers/icons/draw_layer_icon';
import { getFileUpload } from '../../../kibana_services';
import { LAYER_WIZARD_CATEGORY } from '../../../../common';

const ADD_VECTOR_DRAWING_LAYER = 'ADD_VECTOR_DRAWING_LAYER';

export const newVectorLayerWizardConfig: LayerWizard = {
  categories: [LAYER_WIZARD_CATEGORY.ELASTICSEARCH],
  description: i18n.translate('xpack.maps.newVectorLayerWizard.description', {
    defaultMessage: 'Creates a new empty layer. Use this to add shapes to the map',
  }),
  disabledReason: i18n.translate('xpack.maps.newVectorLayerWizard.disabledDesc', {
    defaultMessage:
      'Unable to draw vector shapes, you are missing the Kibana privilege "Index Pattern Management".',
  }),
  getIsDisabled: async () => {
    const hasImportPermission = await getFileUpload().hasImportPermission({
      checkCreateIndexPattern: true,
      checkHasManagePipeline: false,
    });
    return !hasImportPermission;
  },
  icon: DrawLayerIcon,
  prerequisiteSteps: [
    {
      id: ADD_VECTOR_DRAWING_LAYER,
      label: i18n.translate('xpack.maps.newVectorLayerWizard.indexNewLayer', {
        defaultMessage: 'Index new layer',
      }),
    },
  ],
  renderWizard: (renderWizardArguments: RenderWizardArguments) => {
    return <NewVectorLayerEditor {...renderWizardArguments} />;
  },
  title: i18n.translate('xpack.maps.newVectorLayerWizard.title', {
    defaultMessage: 'Create new layer',
  }),
};
