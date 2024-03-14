/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CoreSetup,
  CoreStart,
  Logger,
  Plugin,
  PluginInitializerContext,
  SavedObjectsClient,
} from '@kbn/core/server';
import { SloOrphanSummaryCleanupTask } from './features/alerts_and_slos/services/slo/tasks/orphan_summary_cleanup_task';
import {
  AnnotationsAPI,
  bootstrapAnnotations,
  ScopedAnnotationsClientFactory,
} from './features/alerts_and_slos/lib/annotations/bootstrap_annotations';
import type { ObservabilityConfig } from '.';

import {
  kubernetesGuideConfig,
  kubernetesGuideId,
} from '../common/features/alerts_and_slos/guided_onboarding/kubernetes_guide_config';
import { setupAlertsAndSlosFeature } from './features/alerts_and_slos/setup_alerts_and_slos_feature';
import { setupCasesFeature } from './features/cases/setup_cases_feature';
import {
  ObservabilityPluginSetupDependencies,
  ObservabilityPluginStartDependencies,
} from './types';
import { uiSettings } from './ui_settings';
import { setupAIAssistantFeature } from './features/ai_assistant/setup_ai_assistant_feature';
import { ObservabilityAIAssistantService } from './features/ai_assistant/service';
export type ObservabilityPluginSetup = ReturnType<ObservabilityPlugin['setup']>;

export class ObservabilityPlugin implements Plugin<ObservabilityPluginSetup> {
  private logger: Logger;
  private sloOrphanCleanupTask?: SloOrphanSummaryCleanupTask;

  service: ObservabilityAIAssistantService | undefined;

  constructor(private readonly initContext: PluginInitializerContext) {
    this.initContext = initContext;
    this.logger = initContext.logger.get();
  }

  public setup(
    core: CoreSetup<ObservabilityPluginStartDependencies>,
    plugins: ObservabilityPluginSetupDependencies
  ) {
    const config = this.initContext.config.get<ObservabilityConfig>();

    setupCasesFeature({ plugins });
    const { alertsLocator } = setupAlertsAndSlosFeature({
      plugins,
      core,
      config,
      logger: this.logger,
    });
    const { service } = setupAIAssistantFeature({ plugins, core, logger: this.logger });

    let annotationsApiPromise: Promise<AnnotationsAPI> | undefined;

    core.uiSettings.register(uiSettings);

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

    /**
     * Register a config for the observability guide
     */
    plugins.guidedOnboarding?.registerGuideConfig(kubernetesGuideId, kubernetesGuideConfig);

    this.sloOrphanCleanupTask = new SloOrphanSummaryCleanupTask(
      plugins.taskManager,
      this.logger,
      config
    );

    return {
      service,
      getAlertDetailsConfig() {
        return config.unsafe.alertDetails;
      },
      getScopedAnnotationsClient: async (...args: Parameters<ScopedAnnotationsClientFactory>) => {
        const api = await annotationsApiPromise;
        return api?.getScopedAnnotationsClient(...args);
      },
      alertsLocator,
    };
  }

  public start(core: CoreStart, plugins: ObservabilityPluginStartDependencies) {
    const internalSoClient = new SavedObjectsClient(core.savedObjects.createInternalRepository());
    const internalEsClient = core.elasticsearch.client.asInternalUser;

    this.sloOrphanCleanupTask?.start(plugins.taskManager, internalSoClient, internalEsClient);

    return {
      service: this.service!,
    };
  }

  public stop() {}
}
