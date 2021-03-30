/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { LayerWizard, RenderWizardArguments } from '../../layers/layer_wizard_registry';
import { ClientFileCreateSourceEditor, INDEX_SETUP_STEP_ID, INDEXING_STEP_ID } from './wizard';
import { getFileUpload } from '../../../kibana_services';

export const uploadLayerWizardConfig: LayerWizard = {
  categories: [],
  description: i18n.translate('xpack.maps.fileUploadWizard.description', {
    defaultMessage: 'Index GeoJSON data in Elasticsearch',
  }),
  disabledReason: i18n.translate('xpack.maps.fileUploadWizard.disabledDesc', {
    defaultMessage:
      'Unable to upload files, you are missing the Kibana privilege "Index Pattern Management".',
  }),
  getIsDisabled: async () => {
    const hasImportPermission = await getFileUpload().hasImportPermission({
      checkCreateIndexPattern: true,
      checkHasManagePipeline: false,
    });
    return !hasImportPermission;
  },
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
