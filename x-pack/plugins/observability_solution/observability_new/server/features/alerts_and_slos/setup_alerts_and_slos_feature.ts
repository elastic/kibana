/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup } from '@kbn/core/server';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core-application-common';
import { LogsExplorerLocatorParams, LOGS_EXPLORER_LOCATOR_ID } from '@kbn/deeplinks-observability';
import { i18n } from '@kbn/i18n';
import { Logger } from '@kbn/logging';
import {
  ApmRuleType,
  ES_QUERY_ID,
  ML_ANOMALY_DETECTION_RULE_TYPE_ID,
  METRIC_INVENTORY_THRESHOLD_ALERT_TYPE_ID,
  OBSERVABILITY_THRESHOLD_RULE_TYPE_ID,
} from '@kbn/rule-data-utils';

import { SLO_BURN_RATE_RULE_TYPE_ID } from '../../../common/features/alerts_and_slos/constants';
import { AlertsLocatorDefinition } from '../../../common/features/alerts_and_slos/locators/alerts';
import { observabilityFeatureId, sloFeatureId } from '../../../common/features/alerts_and_slos';
import {
  ObservabilityPluginSetupDependencies,
  ObservabilityPluginStartDependencies,
} from '../../types';
import { getObservabilityServerRouteRepository } from './routes/get_global_observability_server_route_repository';
import { registerSloUsageCollector } from './lib/collectors/register';
import { registerRuleTypes } from './lib/rules/register_rule_types';
import { threshold } from './saved_objects/threshold';
import { slo } from './saved_objects/slo';
import { SO_SLO_TYPE } from './saved_objects';
import { DefaultResourceInstaller, DefaultSLOInstaller } from './services/slo';
import { ObservabilityConfig } from '../..';
import { registerRoutes } from './routes/register_routes';

const sloRuleTypes = [SLO_BURN_RATE_RULE_TYPE_ID];

const o11yRuleTypes = [
  SLO_BURN_RATE_RULE_TYPE_ID,
  OBSERVABILITY_THRESHOLD_RULE_TYPE_ID,
  ES_QUERY_ID,
  ML_ANOMALY_DETECTION_RULE_TYPE_ID,
  METRIC_INVENTORY_THRESHOLD_ALERT_TYPE_ID,
  ...Object.values(ApmRuleType),
];

export function setupAlertsAndSlosFeature({
  core,
  config,
  plugins,
  logger,
}: {
  core: CoreSetup<ObservabilityPluginStartDependencies>;
  config: ObservabilityConfig;
  plugins: ObservabilityPluginSetupDependencies;
  logger: Logger;
}) {
  const { ruleDataService } = plugins.ruleRegistry;
  const alertsLocator = plugins.share.url.locators.create(new AlertsLocatorDefinition());
  const logsExplorerLocator =
    plugins.share.url.locators.get<LogsExplorerLocatorParams>(LOGS_EXPLORER_LOCATOR_ID);

  registerRuleTypes(plugins.alerting, core.http.basePath, config, logger, ruleDataService, {
    alertsLocator,
    logsExplorerLocator,
  });

  registerSloUsageCollector(plugins.usageCollection);

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
      logger,
      repository: getObservabilityServerRouteRepository(config),
    });

    const esInternalClient = coreStart.elasticsearch.client.asInternalUser;

    const sloResourceInstaller = new DefaultResourceInstaller(esInternalClient, logger);
    const sloInstaller = new DefaultSLOInstaller(sloResourceInstaller, logger);
    sloInstaller.install();
  });

  return {
    alertsLocator,
  };
}
