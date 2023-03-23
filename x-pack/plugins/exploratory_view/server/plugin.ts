/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginInitializerContext, Plugin, CoreSetup } from '@kbn/core/server';
import { SpacesPluginSetup } from '@kbn/spaces-plugin/server';
import {
  ScopedAnnotationsClientFactory,
  AnnotationsAPI,
} from './lib/annotations/bootstrap_annotations';

export type ExploratoryViewPluginSetup = ReturnType<ExploratoryViewPlugin['setup']>;

interface PluginSetup {
  spaces?: SpacesPluginSetup;
}

export class ExploratoryViewPlugin implements Plugin<ExploratoryViewPluginSetup> {
  constructor(initContext: PluginInitializerContext) {}

  public setup(core: CoreSetup, plugins: PluginSetup) {
    let annotationsApiPromise: Promise<AnnotationsAPI> | undefined;

    /**
     * Register a config for the observability guide
     */

    return {
      getScopedAnnotationsClient: async (...args: Parameters<ScopedAnnotationsClientFactory>) => {
        const api = await annotationsApiPromise;
        return api?.getScopedAnnotationsClient(...args);
      },
    };
  }

  public start() {}

  public stop() {}
}
