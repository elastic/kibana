/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { PluginInitializerContext, Plugin, CoreSetup, APICaller } from 'src/core/server';
import { take } from 'rxjs/operators';
import { LicensingPluginSetup } from '../../licensing/server';
import { ObservabilityConfig } from '.';
import {
  bootstrapAnnotations,
  ScopedAnnotationsClient,
  AnnotationsAPI,
} from './lib/annotations/bootstrap_annotations';

type LazyScopedAnnotationsClientFactory = (
  apiCaller: APICaller
) => Promise<ScopedAnnotationsClient | undefined>;

export interface ObservabilityPluginSetup {
  getScopedAnnotationsClient: LazyScopedAnnotationsClientFactory;
}

export class ObservabilityPlugin implements Plugin<ObservabilityPluginSetup> {
  constructor(private readonly initContext: PluginInitializerContext) {
    this.initContext = initContext;
  }

  public async setup(
    core: CoreSetup,
    plugins: {
      licensing?: LicensingPluginSetup;
    }
  ): Promise<ObservabilityPluginSetup> {
    const config$ = this.initContext.config.create<ObservabilityConfig>();

    const config = await config$.pipe(take(1)).toPromise();

    let annotationsApiPromise: Promise<AnnotationsAPI> | undefined;

    if (config.annotations.enabled) {
      annotationsApiPromise = bootstrapAnnotations({
        core,
        index: config.annotations.index,
        context: this.initContext,
      }).catch(err => {
        const logger = this.initContext.logger.get('annotations');
        logger.warn(err);
        throw err;
      });
    }

    return {
      getScopedAnnotationsClient: async (apiCaller: APICaller) => {
        const api = await annotationsApiPromise;
        return api?.getScopedAnnotationsClient({
          apiCaller,
          license: await plugins.licensing?.license$.pipe(take(1)).toPromise(),
        });
      },
    };
  }

  public start() {}

  public stop() {}
}
