/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { XYZTMSEditor, XYZTMSSourceConfig } from './xyz_tms_editor';
import { XYZTMSSource, sourceTitle } from './xyz_tms_source';
import { LayerWizard, RenderWizardArguments } from '../../layer_wizard_registry';

export const tmsLayerWizardConfig: LayerWizard = {
  description: i18n.translate('xpack.maps.source.ems_xyzDescription', {
    defaultMessage: 'Tile map service configured in interface',
  }),
  icon: 'grid',
  renderWizard: ({ onPreviewSource }: RenderWizardArguments) => {
    const onSourceConfigChange = (sourceConfig: XYZTMSSourceConfig) => {
      const sourceDescriptor = XYZTMSSource.createDescriptor(sourceConfig);
      const source = new XYZTMSSource(sourceDescriptor);
      onPreviewSource(source);
    };
    return <XYZTMSEditor onSourceConfigChange={onSourceConfigChange} />;
  },
  title: sourceTitle,
};
