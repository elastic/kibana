/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { LayerWizard, RenderWizardArguments } from '../../layers/layer_wizard_registry';
import { ClientFileCreateSourceEditor, INDEX_SETUP_STEP_ID, INDEXING_STEP_ID } from './wizard';

export const uploadLayerWizardConfig: LayerWizard = {
  categories: [],
  description: i18n.translate('xpack.maps.fileUploadWizard.description', {
    defaultMessage: 'Index GeoJSON data in Elasticsearch',
  }),
  icon: 'importAction',
  prerequisiteSteps: [
    {
      id: INDEX_SETUP_STEP_ID,
      label: i18n.translate('xpack.maps.fileUploadWizard.importFileSetupLabel', {
        defaultMessage: 'Import file',
      }),
    },
    {
      id: INDEXING_STEP_ID,
      label: i18n.translate('xpack.maps.fileUploadWizard.indexingLabel', {
        defaultMessage: 'Importing file',
      }),
    },
  ],
  renderWizard: (renderWizardArguments: RenderWizardArguments) => {
    return <ClientFileCreateSourceEditor {...renderWizardArguments} />;
  },
  title: i18n.translate('xpack.maps.fileUploadWizard.title', {
    defaultMessage: 'Upload GeoJSON',
  }),
};
