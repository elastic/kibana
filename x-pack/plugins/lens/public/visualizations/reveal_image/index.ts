/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core/public';
import { FilesClient } from '@kbn/files-plugin/public';
import { FileImageMetadata } from '@kbn/shared-ux-file-types';
import type { EditorFrameSetup } from '../../types';

export interface RevealImageVisualizationPluginSetupPlugins {
  editorFrame: EditorFrameSetup;
  files: FilesClient<FileImageMetadata>;
}

export class RevealImageVisualization {
  setup(core: CoreSetup, { editorFrame, files }: RevealImageVisualizationPluginSetupPlugins) {
    editorFrame.registerVisualization(async () => {
      const { getRevealImageVisualization } = await import('../../async_services');
      return getRevealImageVisualization({ files, theme: core.theme });
    });
  }
}
