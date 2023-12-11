/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { CreateSourceEditor } from './create_source_editor';
import { LayerWizard, RenderWizardArguments } from '../../layers';
import { sourceTitle } from './esql_source';
import {
  LAYER_WIZARD_CATEGORY,
  WIZARD_ID,
} from '../../../../common/constants';
import { DocumentsLayerIcon } from '../../layers/wizards/icons/documents_layer_icon';

export const esqlLayerWizardConfig: LayerWizard = {
  id: WIZARD_ID.ESQL,
  order: 10,
  categories: [LAYER_WIZARD_CATEGORY.ELASTICSEARCH],
  description: '',
  icon: DocumentsLayerIcon,
  isBeta: true,
  renderWizard: ({ previewLayers, mapColors }: RenderWizardArguments) => {
    return <CreateSourceEditor />;
  },
  title: sourceTitle,
};
