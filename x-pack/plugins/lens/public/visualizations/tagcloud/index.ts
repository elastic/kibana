/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core/public';
import type { EditorFrameSetup } from '../../types';

export interface TagcloudVisualizationPluginSetupPlugins {
  editorFrame: EditorFrameSetup;
}

export class TagcloudVisualization {
  setup(core: CoreSetup, { editorFrame }: TagcloudVisualizationPluginSetupPlugins) {
    editorFrame.registerVisualization(async () => {
      const { getTagcloudVisualization } = await import('../../async_services');
      return getTagcloudVisualization({ theme: core.theme });
    });
  }
}
