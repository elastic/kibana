/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { PluginInitializerContext, Plugin, CoreSetup } from 'src/core/server';
import { take } from 'rxjs/operators';
import { ObservabilityConfig } from '.';
import {
  bootstrapAnnotations,
  ScopedAnnotationsClient,
  ScopedAnnotationsClientFactory,
  AnnotationsAPI,
} from './lib/annotations/bootstrap_annotations';

type LazyScopedAnnotationsClientFactory = (
  ...args: Parameters<ScopedAnnotationsClientFactory>
) => Promise<ScopedAnnotationsClient | undefined>;

export interface ObservabilityPluginSetup {
  getScopedAnnotationsClient: LazyScopedAnnotationsClientFactory;
}

export class ObservabilityPlugin implements Plugin<ObservabilityPluginSetup> {
  constructor(private readonly initContext: PluginInitializerContext) {
    this.initContext = initContext;
  }

  public async setup(core: CoreSetup, plugins: {}): Promise<ObservabilityPluginSetup> {
    const config$ = this.initContext.config.create<ObservabilityConfig>();

    const config = await config$.pipe(take(1)).toPromise();

    let annotationsApiPromise: Promise<AnnotationsAPI> | undefined;

    if (config.annotations.enabled) {
      annotationsApiPromise = bootstrapAnnotations({
        core,
        index: config.annotations.index,
        context: this.initContext,
      }).catch((err) => {
        const logger = this.initContext.logger.get('annotations');
        logger.warn(err);
        throw err;
      });
    }

    return {
      getScopedAnnotationsClient: async (...args) => {
        const api = await annotationsApiPromise;
        return api?.getScopedAnnotationsClient(...args);
      },
    };
  }

  public start() {}

  public stop() {}
}
