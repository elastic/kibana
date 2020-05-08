/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AppMountParameters, CoreSetup, CoreStart } from 'kibana/public';
import { NOT_INTERNATIONALIZED_PRODUCT_NAME } from '../common';
import { getPipelineBuilderAliasConfig } from './vis_type_alias';
import { PipelineAppDeps, PipelineSetupDependencies, PipelineStartDependencies } from './types';

import './index.scss';

export class PipelineBuilderPlugin {
  constructor() {}

  setup(
    core: CoreSetup<PipelineSetupDependencies, void>,
    { visualizations, embeddable }: PipelineSetupDependencies
  ) {
    visualizations.registerAlias(getPipelineBuilderAliasConfig());

    core.application.register({
      id: 'pipeline_builder',
      title: NOT_INTERNATIONALIZED_PRODUCT_NAME,
      mount: async (params: AppMountParameters) => {
        const { mountApp } = await import('./mount');
        const [coreStart, depsStart] = await core.getStartServices();
        return mountApp(coreStart, (depsStart as unknown) as PipelineAppDeps, params);
      },
    });

    if (embeddable) {
      // embeddable.registerEmbeddableFactory(
      //   'pipeline_builder',
      //   new EmbeddableFactory(getStartServices)
      // );
    }
  }

  start(core: CoreStart, startDependencies: PipelineStartDependencies) {}

  stop() {}
}
