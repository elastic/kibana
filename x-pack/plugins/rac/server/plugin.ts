import { i18n } from '@kbn/i18n';
import {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin,
  Logger,
  DEFAULT_APP_CATEGORIES,
} from '../../../../src/core/server';
import { DataPluginSetup, DataPluginStart } from '../../../../src/plugins/data/server/plugin';
import {
  TelemetryPluginSetup,
  TelemetryPluginStart,
} from '../../../../src/plugins/telemetry/server';
import { UsageCollectionSetup } from '../../../../src/plugins/usage_collection/server';
import { LicensingPluginStart } from '../../licensing/server';
import { RuleRegistryPluginSetupContract } from '../../rule_registry/server';
import { ecsFieldMap } from '../../rule_registry/server/generated/ecs_field_map';
import { pickWithPatterns } from '../../rule_registry/server/rule_registry/field_map/pick_with_patterns';
import { TaskManagerSetupContract, TaskManagerStartContract } from '../../task_manager/server';
import { PLUGIN_ID, RacPageName } from '../common';
import { LIFECYCLE_RULE_ALERT_TYPE_ID } from '../public/types';
import { legacySignalFieldMap } from './field_mappings/legacy_signal_field_map';
import { lifecycleRuleAlertType } from './rules/lifecycle_rule_alert_type';
import { PluginSetupContract as FeaturesSetup } from '../../features/server';

import {
  PluginSetupContract as AlertingSetup,
  PluginStartContract as AlertPluginStartContract,
} from '../../alerting/server';

import { RacPluginSetup, RacPluginStart } from './types';
import { defineRoutes } from './routes';
import { createEsContext, EsContext } from './es';

export interface SetupPlugins {
  ruleRegistry: RuleRegistryPluginSetupContract;
  data: DataPluginSetup;
  features: FeaturesSetup;
  taskManager?: TaskManagerSetupContract;
  usageCollection?: UsageCollectionSetup;
  telemetry?: TelemetryPluginSetup;
}

export interface StartPlugins {
  alerting: AlertPluginStartContract;
  data: DataPluginStart;
  licensing: LicensingPluginStart;
  taskManager?: TaskManagerStartContract;
  telemetry?: TelemetryPluginStart;
}

const racSubPlugins = [
  PLUGIN_ID,
  `${PLUGIN_ID}:${RacPageName.rules}`,
  `${PLUGIN_ID}:${RacPageName.alerts}`,
  `${PLUGIN_ID}:${RacPageName.cases}`,
];

export type RacRuleRegistry = SetupPlugins['ruleRegistry'];

export class RacPlugin implements Plugin<RacPluginSetup, RacPluginStart> {
  private readonly logger: Logger;
  private readonly kibanaVersion: PluginInitializerContext['env']['packageInfo']['version'];
  private esContext?: EsContext;

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
    this.kibanaVersion = this.initializerContext.env.packageInfo.version;
  }

  public setup(core: CoreSetup, plugins: SetupPlugins) {
    this.logger.debug('rac: Setup');
    const router = core.http.createRouter();

    // Register server side APIs
    defineRoutes(router);

    this.esContext = createEsContext({
      logger: this.logger,
      // TODO: get index prefix from config.get(kibana.index)
      indexNameRoot: '',
      elasticsearchClientPromise: core
        .getStartServices()
        .then(([{ elasticsearch }]) => elasticsearch.client.asInternalUser),
      kibanaVersion: this.kibanaVersion,
    });

    plugins.features.registerKibanaFeature({
      id: PLUGIN_ID,
      name: i18n.translate('xpack.rac.featureRegistry.racTitle', {
        defaultMessage: 'Rule, Alerts, Cases',
      }),
      order: 1100,
      category: DEFAULT_APP_CATEGORIES.rac,
      app: [...racSubPlugins, 'kibana'],
      catalogue: ['rac'],
      management: {
        insightsAndAlerting: ['triggersActions'],
      },
      alerting: [LIFECYCLE_RULE_ALERT_TYPE_ID],
      privileges: {
        all: {
          app: [...racSubPlugins, 'kibana'],
          catalogue: ['rac'],
          api: ['rac', 'lists-all', 'lists-read'],
          savedObject: {
            all: ['alert', 'exception-list', 'exception-list-agnostic'],
            read: ['config'],
          },
          alerting: {
            all: [LIFECYCLE_RULE_ALERT_TYPE_ID],
          },
          management: {
            insightsAndAlerting: ['triggersActions'],
          },
          ui: ['show', 'crud'],
        },
        read: {
          app: [...racSubPlugins, 'kibana'],
          catalogue: ['rac'],
          api: ['rac', 'lists-read'],
          savedObject: {
            all: [],
            read: ['config', 'exception-list', 'exception-list-agnostic'],
          },
          alerting: {
            read: [LIFECYCLE_RULE_ALERT_TYPE_ID],
          },
          management: {
            insightsAndAlerting: ['triggersActions'],
          },
          ui: ['show'],
        },
      },
    });

    // Create a couple test registries
    const ruleRegistry = plugins.ruleRegistry.create({
      namespace: 'rac',
      fieldMap: {
        ...legacySignalFieldMap,
      },
    });

    ruleRegistry.registerType(lifecycleRuleAlertType);

    return {
      ruleRegistry,
    };
  }

  public start(core: CoreStart) {
    this.logger.debug('rac: Started');
    if (!this.esContext) throw new Error('esContext not initialized');

    // launches initialization async
    // if (this.eventLogService.isIndexingEntries()) {
    this.esContext.initialize();
    // }

    // Log an error if initialization didn't succeed.
    // Note that waitTillReady() is used elsewhere as a gate to having the
    // event log initialization complete - successfully or not.  Other uses
    // of this do not bother logging when success is false, as they are in
    // paths that would cause log spamming.  So we do it once, here, just to
    // ensure an unsuccessful initialization is logged when it occurs.
    this.esContext.waitTillReady().then((success) => {
      if (!success) {
        this.logger.error(`initialization failed, events will not be indexed`);
      }
    });

    return {};
  }

  public stop() {}
}
