/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import type { FilesClientFactory } from './types';
import { createFilesClient } from './files_client';

export interface FilesSetup {
  filesClientFactory: FilesClientFactory;
}

export type FilesStart = FilesSetup;

export class FilesPlugin implements Plugin<FilesSetup, FilesStart> {
  private api: undefined | FilesSetup;

  setup(core: CoreSetup): FilesSetup {
    this.api = {
      filesClientFactory: {
        asScoped(fileKind: string) {
          return createFilesClient({ fileKind, http: core.http });
        },
      },
    };
    return this.api;
  }

  start(core: CoreStart): FilesStart {
    return this.api!;
  }
}
