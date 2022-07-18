/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { firstValueFrom, Observable } from 'rxjs';
import { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/server';
import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import { Config } from '../common';

interface SetupDependencies {
  usageCollection?: UsageCollectionSetup;
}

interface StartDependencies {
  usageCollection?: unknown;
}

export class DiscoverEnhancedPlugin
  implements Plugin<void, void, SetupDependencies, StartDependencies>
{
  private config$: Observable<Config>;

  constructor(protected readonly context: PluginInitializerContext) {
    this.config$ = context.config.create<Config>();
  }

  public setup(core: CoreSetup, { usageCollection }: SetupDependencies) {
    if (!!usageCollection) {
      const collector = usageCollection.makeUsageCollector<{
        exploreDataInChartActionEnabled: boolean;
      }>({
        type: 'discoverEnhanced',
        schema: {
          exploreDataInChartActionEnabled: {
            type: 'boolean',
          },
        },
        isReady: () => true,
        fetch: async () => {
          const config = await firstValueFrom(this.config$);
          return {
            exploreDataInChartActionEnabled: config.actions.exploreDataInChart.enabled,
          };
        },
      });
      usageCollection.registerCollector(collector);
    }
  }

  public start(core: CoreStart) {}
}
