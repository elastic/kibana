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
import { LAYER_WIZARD_CATEGORY } from '../../../../common/constants';

const ADD_VECTOR_DRAWING_LAYER = 'ADD_VECTOR_DRAWING_LAYER';

export const newVectorLayerWizardConfig: LayerWizard = {
  categories: [LAYER_WIZARD_CATEGORY.ELASTICSEARCH],
  description: i18n.translate('xpack.maps.newVectorLayerWizard.description', {
    defaultMessage: 'Draw shapes on the map and index in Elasticsearch',
  }),
  disabledReason: i18n.translate('xpack.maps.newVectorLayerWizard.disabledDesc', {
    defaultMessage:
      'Unable to create index, you are missing the Kibana privilege "Index Pattern Management".',
  }),
  getIsDisabled: async () => {
    const hasImportPermission = await getFileUpload().hasImportPermission({
      checkCreateIndexPattern: true,
      checkHasManagePipeline: false,
    });
    return !hasImportPermission;
  },
  isBeta: true,
  icon: DrawLayerIcon,
  prerequisiteSteps: [
    {
      id: ADD_VECTOR_DRAWING_LAYER,
      label: i18n.translate('xpack.maps.newVectorLayerWizard.indexNewLayer', {
        defaultMessage: 'Create index',
      }),
    },
  ],
  renderWizard: (renderWizardArguments: RenderWizardArguments) => {
    return <NewVectorLayerEditor {...renderWizardArguments} />;
  },
  showFeatureEditTools: true,
  title: i18n.translate('xpack.maps.newVectorLayerWizard.title', {
    defaultMessage: 'Create index',
  }),
};
