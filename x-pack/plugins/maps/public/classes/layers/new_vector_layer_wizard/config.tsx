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
import { CREATE_DRAWN_FEATURES_INDEX_STEP_ID, ADD_DRAWN_FEATURES_TO_INDEX_STEP_ID } from './wizard';
import { getFileUpload } from '../../../kibana_services';

export const newVectorLayerWizardConfig: LayerWizard = {
  categories: [],
  description: i18n.translate('xpack.maps.newVectorLayerWizard.description', {
    defaultMessage: 'Draw points & shapes and save in Elasticsearch',
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
  icon: DocumentsLayerIcon,
  prerequisiteSteps: [
    {
      id: CREATE_DRAWN_FEATURES_INDEX_STEP_ID,
      label: i18n.translate('xpack.maps.newVectorLayerWizard.indexFeatures', {
        defaultMessage: 'Index features',
      }),
    },
    {
      id: ADD_DRAWN_FEATURES_TO_INDEX_STEP_ID,
      label: i18n.translate('xpack.maps.newVectorLayerWizard.indexingFeatures', {
        defaultMessage: 'Indexing features',
      }),
    },
  ],
  renderWizard: (renderWizardArguments: RenderWizardArguments) => {
    return <NewVectorLayerEditor {...renderWizardArguments} />;
  },
  title: i18n.translate('xpack.maps.newVectorLayerWizard.title', {
    defaultMessage: 'Draw new vector layer',
  }),
};
