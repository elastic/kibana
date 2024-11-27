/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { Subscription } from 'rxjs';
import type { CoreStart, CoreSetup, Plugin, PluginInitializerContext } from '@kbn/core/public';

import { PLUGIN_ID } from '../common/constants';
import { uiMetricService, apiService } from './application/services';
import type { SetupDependencies, StartDependencies, ILicense, Config } from './types';
import { IngestPipelinesLocatorDefinition } from './locator';

export class IngestPipelinesPlugin
  implements Plugin<void, void, SetupDependencies, StartDependencies>
{
  private license: ILicense | null = null;
  private licensingSubscription?: Subscription;
  private readonly config: Config;

  constructor(initializerContext: PluginInitializerContext<Config>) {
    this.config = initializerContext.config.get();
  }

  public setup(coreSetup: CoreSetup<StartDependencies>, plugins: SetupDependencies): void {
    const { management, usageCollection, share } = plugins;
    const { http, getStartServices } = coreSetup;

    // Initialize services
    uiMetricService.setup(usageCollection);
    apiService.setup(http, uiMetricService);

    const pluginName = i18n.translate('xpack.ingestPipelines.appTitle', {
      defaultMessage: 'Ingest Pipelines',
    });

    management.sections.section.ingest.registerApp({
      id: PLUGIN_ID,
      order: 1,
      title: pluginName,
      mount: async (params) => {
        const [coreStart] = await getStartServices();

        const {
          chrome: { docTitle },
        } = coreStart;

        docTitle.change(pluginName);

        const { mountManagementSection } = await import('./application/mount_management_section');
        const unmountAppCallback = await mountManagementSection(coreSetup, {
          ...params,
          license: this.license,
          config: {
            enableManageProcessors: this.config.enableManageProcessors !== false,
          },
        });

        return () => {
          docTitle.reset();
          unmountAppCallback();
        };
      },
    });

    share.url.locators.create(
      new IngestPipelinesLocatorDefinition({
        managementAppLocator: management.locator,
      })
    );
  }

  public start(core: CoreStart, { licensing }: StartDependencies) {
    this.licensingSubscription = licensing?.license$.subscribe((license) => {
      this.license = license;
    });
  }

  public stop() {
    this.licensingSubscription?.unsubscribe();
  }
}
