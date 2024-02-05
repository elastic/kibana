/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginSetupContract, PluginStartContract } from '@kbn/alerting-plugin/server';
import {
  createUICapabilities as createCasesUICapabilities,
  getApiTags as getCasesApiTags,
} from '@kbn/cases-plugin/common';
import { CloudSetup } from '@kbn/cloud-plugin/server';
import {
  CoreSetup,
  CoreStart,
  DEFAULT_APP_CATEGORIES,
  Logger,
  Plugin,
  PluginInitializerContext,
  SavedObjectsClient,
} from '@kbn/core/server';
import { LogsExplorerLocatorParams, LOGS_EXPLORER_LOCATOR_ID } from '@kbn/deeplinks-observability';
import { PluginSetupContract as FeaturesSetup } from '@kbn/features-plugin/server';
import { hiddenTypes as filesSavedObjectTypes } from '@kbn/files-plugin/server/saved_objects';
import type { GuidedOnboardingPluginSetup } from '@kbn/guided-onboarding-plugin/server';
import { i18n } from '@kbn/i18n';
import {
  ApmRuleType,
  ES_QUERY_ID,
  ML_ANOMALY_DETECTION_RULE_TYPE_ID,
  METRIC_INVENTORY_THRESHOLD_ALERT_TYPE_ID,
  OBSERVABILITY_THRESHOLD_RULE_TYPE_ID,
} from '@kbn/rule-data-utils';
import {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { RuleRegistryPluginSetupContract } from '@kbn/rule-registry-plugin/server';
import { SharePluginSetup } from '@kbn/share-plugin/server';
import { SpacesPluginSetup, SpacesPluginStart } from '@kbn/spaces-plugin/server';
import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import { SloOrphanSummaryCleanupTask } from './services/slo/tasks/orphan_summary_cleanup_task';
import { ObservabilityConfig } from '.';
import { casesFeatureId, observabilityFeatureId, sloFeatureId } from '../common';
import { SLO_BURN_RATE_RULE_TYPE_ID } from '../common/constants';
import {
  kubernetesGuideConfig,
  kubernetesGuideId,
} from '../common/guided_onboarding/kubernetes_guide_config';
import { AlertsLocatorDefinition } from '../common/locators/alerts';
import {
  AnnotationsAPI,
  bootstrapAnnotations,
  ScopedAnnotationsClientFactory,
} from './lib/annotations/bootstrap_annotations';
import { registerSloUsageCollector } from './lib/collectors/register';
import { registerRuleTypes } from './lib/rules/register_rule_types';
import { getObservabilityServerRouteRepository } from './routes/get_global_observability_server_route_repository';
import { registerRoutes } from './routes/register_routes';
import { slo, SO_SLO_TYPE } from './saved_objects';
import { threshold } from './saved_objects/threshold';
import { DefaultResourceInstaller, DefaultSLOInstaller } from './services/slo';

import { uiSettings } from './ui_settings';

export type ObservabilityPluginSetup = ReturnType<ObservabilityPlugin['setup']>;

interface PluginSetup {
  alerting: PluginSetupContract;
  features: FeaturesSetup;
  guidedOnboarding?: GuidedOnboardingPluginSetup;
  ruleRegistry: RuleRegistryPluginSetupContract;
  share: SharePluginSetup;
  spaces?: SpacesPluginSetup;
  usageCollection?: UsageCollectionSetup;
  cloud?: CloudSetup;
  taskManager: TaskManagerSetupContract;
}

interface PluginStart {
  alerting: PluginStartContract;
  taskManager: TaskManagerStartContract;
  spaces?: SpacesPluginStart;
}

const sloRuleTypes = [SLO_BURN_RATE_RULE_TYPE_ID];

const o11yRuleTypes = [
  SLO_BURN_RATE_RULE_TYPE_ID,
  OBSERVABILITY_THRESHOLD_RULE_TYPE_ID,
  ES_QUERY_ID,
  ML_ANOMALY_DETECTION_RULE_TYPE_ID,
  METRIC_INVENTORY_THRESHOLD_ALERT_TYPE_ID,
  ...Object.values(ApmRuleType),
];

export class ObservabilityPlugin implements Plugin<ObservabilityPluginSetup> {
  private logger: Logger;
  private sloOrphanCleanupTask?: SloOrphanSummaryCleanupTask;

  constructor(private readonly initContext: PluginInitializerContext) {
    this.initContext = initContext;
    this.logger = initContext.logger.get();
  }

  public setup(core: CoreSetup<PluginStart>, plugins: PluginSetup) {
    const casesCapabilities = createCasesUICapabilities();
    const casesApiTags = getCasesApiTags(observabilityFeatureId);

    const config = this.initContext.config.get<ObservabilityConfig>();

    const alertsLocator = plugins.share.url.locators.create(new AlertsLocatorDefinition());
    const logsExplorerLocator =
      plugins.share.url.locators.get<LogsExplorerLocatorParams>(LOGS_EXPLORER_LOCATOR_ID);

    plugins.features.registerKibanaFeature({
      id: casesFeatureId,
      name: i18n.translate('xpack.observability.featureRegistry.linkObservabilityTitle', {
        defaultMessage: 'Cases',
      }),
      order: 1100,
      category: DEFAULT_APP_CATEGORIES.observability,
      app: [casesFeatureId, 'kibana'],
      catalogue: [observabilityFeatureId],
      cases: [observabilityFeatureId],
      privileges: {
        all: {
          api: casesApiTags.all,
          app: [casesFeatureId, 'kibana'],
          catalogue: [observabilityFeatureId],
          cases: {
            create: [observabilityFeatureId],
            read: [observabilityFeatureId],
            update: [observabilityFeatureId],
            push: [observabilityFeatureId],
          },
          savedObject: {
            all: [...filesSavedObjectTypes],
            read: [...filesSavedObjectTypes],
          },
          ui: casesCapabilities.all,
        },
        read: {
          api: casesApiTags.read,
          app: [casesFeatureId, 'kibana'],
          catalogue: [observabilityFeatureId],
          cases: {
            read: [observabilityFeatureId],
          },
          savedObject: {
            all: [],
            read: [...filesSavedObjectTypes],
          },
          ui: casesCapabilities.read,
        },
      },
      subFeatures: [
        {
          name: i18n.translate('xpack.observability.featureRegistry.deleteSubFeatureName', {
            defaultMessage: 'Delete',
          }),
          privilegeGroups: [
            {
              groupType: 'independent',
              privileges: [
                {
                  api: casesApiTags.delete,
                  id: 'cases_delete',
                  name: i18n.translate(
                    'xpack.observability.featureRegistry.deleteSubFeatureDetails',
                    {
                      defaultMessage: 'Delete cases and comments',
                    }
                  ),
                  includeIn: 'all',
                  savedObject: {
                    all: [...filesSavedObjectTypes],
                    read: [...filesSavedObjectTypes],
                  },
                  cases: {
                    delete: [observabilityFeatureId],
                  },
                  ui: casesCapabilities.delete,
                },
              ],
            },
          ],
        },
        {
          name: i18n.translate('xpack.observability.featureRegistry.casesSettingsSubFeatureName', {
            defaultMessage: 'Case settings',
          }),
          privilegeGroups: [
            {
              groupType: 'independent',
              privileges: [
                {
                  id: 'cases_settings',
                  name: i18n.translate(
                    'xpack.observability.featureRegistry.casesSettingsSubFeatureDetails',
                    {
                      defaultMessage: 'Edit case settings',
                    }
                  ),
                  includeIn: 'all',
                  savedObject: {
                    all: [...filesSavedObjectTypes],
                    read: [...filesSavedObjectTypes],
                  },
                  cases: {
                    settings: [observabilityFeatureId],
                  },
                  ui: casesCapabilities.settings,
                },
              ],
            },
          ],
        },
      ],
    });

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

    if (config.createO11yGenericFeatureId) {
      plugins.features.registerKibanaFeature({
        id: observabilityFeatureId,
        name: i18n.translate('xpack.observability.nameFeatureTitle', {
          defaultMessage: 'Observability',
        }),
        order: 1000,
        category: DEFAULT_APP_CATEGORIES.observability,
        app: [observabilityFeatureId],
        catalogue: [observabilityFeatureId],
        alerting: o11yRuleTypes,
        privileges: {
          all: {
            app: [observabilityFeatureId],
            catalogue: [observabilityFeatureId],
            api: ['rac'],
            savedObject: {
              all: [],
              read: [],
            },
            alerting: {
              rule: {
                all: o11yRuleTypes,
              },
              alert: {
                all: o11yRuleTypes,
              },
            },
            ui: ['read', 'write'],
          },
          read: {
            app: [observabilityFeatureId],
            catalogue: [observabilityFeatureId],
            api: ['rac'],
            savedObject: {
              all: [],
              read: [],
            },
            alerting: {
              rule: {
                read: o11yRuleTypes,
              },
              alert: {
                read: o11yRuleTypes,
              },
            },
            ui: ['read'],
          },
        },
      });
    }

    const { ruleDataService } = plugins.ruleRegistry;

    const savedObjectTypes = [SO_SLO_TYPE];
    plugins.features.registerKibanaFeature({
      id: sloFeatureId,
      name: i18n.translate('xpack.observability.featureRegistry.linkSloTitle', {
        defaultMessage: 'SLOs',
      }),
      order: 1200,
      category: DEFAULT_APP_CATEGORIES.observability,
      app: [sloFeatureId, 'kibana'],
      catalogue: [sloFeatureId, 'observability'],
      alerting: sloRuleTypes,
      privileges: {
        all: {
          app: [sloFeatureId, 'kibana'],
          catalogue: [sloFeatureId, 'observability'],
          api: ['slo_write', 'slo_read', 'rac'],
          savedObject: {
            all: savedObjectTypes,
            read: [],
          },
          alerting: {
            rule: {
              all: sloRuleTypes,
            },
            alert: {
              all: sloRuleTypes,
            },
          },
          ui: ['read', 'write'],
        },
        read: {
          app: [sloFeatureId, 'kibana'],
          catalogue: [sloFeatureId, 'observability'],
          api: ['slo_read', 'rac'],
          savedObject: {
            all: [],
            read: savedObjectTypes,
          },
          alerting: {
            rule: {
              read: sloRuleTypes,
            },
            alert: {
              read: sloRuleTypes,
            },
          },
          ui: ['read'],
        },
      },
    });

    core.savedObjects.registerType(slo);
    core.savedObjects.registerType(threshold);

    registerRuleTypes(plugins.alerting, core.http.basePath, config, this.logger, ruleDataService, {
      alertsLocator,
      logsExplorerLocator,
    });
    registerSloUsageCollector(plugins.usageCollection);

    core.getStartServices().then(([coreStart, pluginStart]) => {
      registerRoutes({
        core,
        config,
        dependencies: {
          pluginsSetup: {
            ...plugins,
            core,
          },
          spaces: pluginStart.spaces,
          ruleDataService,
          getRulesClientWithRequest: pluginStart.alerting.getRulesClientWithRequest,
        },
        logger: this.logger,
        repository: getObservabilityServerRouteRepository(config),
      });

      const esInternalClient = coreStart.elasticsearch.client.asInternalUser;

      const sloResourceInstaller = new DefaultResourceInstaller(esInternalClient, this.logger);
      const sloInstaller = new DefaultSLOInstaller(sloResourceInstaller, this.logger);
      sloInstaller.install();
    });
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

  public start(core: CoreStart, plugins: PluginStart) {
    const internalSoClient = new SavedObjectsClient(core.savedObjects.createInternalRepository());
    const internalEsClient = core.elasticsearch.client.asInternalUser;

    this.sloOrphanCleanupTask?.start(plugins.taskManager, internalSoClient, internalEsClient);
  }

  public stop() {}
}
