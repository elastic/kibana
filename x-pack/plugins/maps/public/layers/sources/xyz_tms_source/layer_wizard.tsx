/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { XYZTMSEditor } from './xyz_tms_editor';
import { XYZTMSSource } from './xyz_tms_source';

export const tmsLayerWizardConfig = {
  description: i18n.translate('xpack.maps.source.ems_xyzDescription', {
    defaultMessage: 'Tile map service configured in interface',
  }),
  icon: 'grid',
  renderWizard: ({ onPreviewSource, inspectorAdapters }) => {
    const onSourceConfigChange = sourceConfig => {
      const sourceDescriptor = XYZTMSSource.createDescriptor(sourceConfig);
      const source = new XYZTMSSource(sourceDescriptor, inspectorAdapters);
      onPreviewSource(source);
    };
    return <XYZTMSEditor onSourceConfigChange={onSourceConfigChange} />;
  },
  title: sourceTitle,
};
