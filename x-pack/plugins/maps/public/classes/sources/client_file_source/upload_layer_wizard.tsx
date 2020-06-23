/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { LayerWizard, RenderWizardArguments } from '../../layers/layer_wizard_registry';
import { ClientFileCreateSourceEditor, INDEX_STEP_ID } from './create_client_file_source_editor';

export const uploadLayerWizardConfig: LayerWizard = {
  categories: [],
  description: i18n.translate('xpack.maps.source.geojsonFileDescription', {
    defaultMessage: 'Index GeoJSON data in Elasticsearch',
  }),
  icon: 'importAction',
  prerequisiteSteps: [
    {
      id: INDEX_STEP_ID,
      label: i18n.translate('xpack.maps.fileUploadWizard.importFile', {
        defaultMessage: 'Import file',
      }),
    },
  ],
  renderWizard: (renderWizardArguments: RenderWizardArguments) => {
    return <ClientFileCreateSourceEditor {...renderWizardArguments} />;
  },
  title: i18n.translate('xpack.maps.source.geojsonFileTitle', {
    defaultMessage: 'Upload GeoJSON',
  }),
};
