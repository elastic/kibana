/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/server';
import { FilesSetup, FilesStart } from '@kbn/files-plugin/server';
import { imageEmbeddableFileKind } from '../common';

export interface ImageEmbeddablePluginsSetup {
  files: FilesSetup;
}

export interface ImageEmbeddableExamplePluginsStart {
  files: FilesStart;
}

export class ImageEmbeddablePlugin
  implements
    Plugin<unknown, unknown, ImageEmbeddablePluginsSetup, ImageEmbeddableExamplePluginsStart>
{
  constructor(initializerContext: PluginInitializerContext) {}

  public setup(core: CoreSetup, { files }: ImageEmbeddablePluginsSetup) {
    files.registerFileKind(imageEmbeddableFileKind);

    return {};
  }

  public start(core: CoreStart) {
    return {};
  }

  public stop() {}
}
