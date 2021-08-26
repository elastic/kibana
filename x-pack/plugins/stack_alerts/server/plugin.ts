/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Plugin, Logger, CoreSetup, PluginInitializerContext, CoreStart } from 'src/core/server';

import { once } from 'lodash';
import { StackAlertsDeps, StackAlertsStartDeps } from './types';
import { registerBuiltInAlertTypes, registerLegacyBuiltInAlertTypes } from './alert_types';
import { BUILT_IN_ALERTS_FEATURE } from './feature';
import { RuleDataClient } from '../../rule_registry/server';
import {
  ECS_COMPONENT_TEMPLATE_NAME,
  TECHNICAL_COMPONENT_TEMPLATE_NAME,
} from '../../rule_registry/common/assets';
import { mappingFromFieldMap } from '../../rule_registry/common/mapping_from_field_map';
import { setIndexPatternsService, setInternalRepository } from './kibana_services';
import { PluginStart as DataPluginStart } from '../../../../src/plugins/data/server';

export interface StartDeps {
  data: DataPluginStart;
}

export class AlertingBuiltinsPlugin
  implements Plugin<void, void, StackAlertsDeps, StackAlertsStartDeps> {
  private readonly logger: Logger;
  private alertsIndexPattern: string = '';
  private setIndexPattern: (() => void) | null = null;

  constructor(ctx: PluginInitializerContext) {
    this.logger = ctx.logger.get();
  }

  public setup(
    core: CoreSetup<StackAlertsStartDeps>,
    { alerting, features, ruleRegistry }: StackAlertsDeps
  ) {
    features.registerKibanaFeature(BUILT_IN_ALERTS_FEATURE);

    const { ruleDataService } = ruleRegistry;
    this.alertsIndexPattern = ruleDataService.getFullAssetName('stack-alerts*');
    let ruleDataClient: RuleDataClient | null = null;
    const initializeRuleDataTemplates = once(async () => {
      const componentTemplateName = ruleDataService.getFullAssetName('stack-alerts-mappings');

      if (!ruleDataService.isWriteEnabled()) {
        return;
      }

      await ruleDataService.createOrUpdateComponentTemplate({
        name: componentTemplateName,
        body: {
          template: {
            settings: {
              number_of_shards: 1,
            },
            mappings: mappingFromFieldMap(
              {
                alertId: {
                  type: 'keyword',
                },
                entityId: {
                  type: 'keyword',
                },
                entityDateTime: {
                  type: 'date',
                },
                entityDocumentId: {
                  type: 'keyword',
                },
                detectionDateTime: {
                  type: 'date',
                },
                entityLocation: {
                  type: 'geo_point',
                },
                containingBoundaryId: {
                  type: 'keyword',
                },
                containingBoundaryName: {
                  type: 'keyword',
                },
              },
              'strict'
            ),
          },
        },
      });

      await ruleDataService.createOrUpdateIndexTemplate({
        name: ruleDataService.getFullAssetName('stack-alerts.tracking-containment-index-template'),
        body: {
          index_patterns: [this.alertsIndexPattern],
          composed_of: [
            ruleDataService.getFullAssetName(TECHNICAL_COMPONENT_TEMPLATE_NAME),
            ruleDataService.getFullAssetName(ECS_COMPONENT_TEMPLATE_NAME),
            componentTemplateName,
          ],
        },
      });
      await ruleDataService.updateIndexMappingsMatchingPattern(this.alertsIndexPattern);
    });

    // initialize eagerly
    const initializeRuleDataTemplatesPromise = initializeRuleDataTemplates().catch((err) => {
      this.logger!.error(err);
    });

    ruleDataClient = ruleDataService.getRuleDataClient(
      'synthetics', // TODO: Update rbac package to include stack alerts geo
      ruleDataService.getFullAssetName('stack-alerts'),
      async () => {
        return initializeRuleDataTemplatesPromise;
      }
    );
    ruleDataClient.createWriteTargetIfNeeded({}).then(() => {
      if (this.setIndexPattern) {
        this.setIndexPattern();
      }
    });

    registerBuiltInAlertTypes({
      logger: this.logger,
      data: core
        .getStartServices()
        .then(async ([, { triggersActionsUi }]) => triggersActionsUi.data),
      alerting,
      ruleDataClient,
    });
    registerLegacyBuiltInAlertTypes({
      logger: this.logger,
      data: core
        .getStartServices()
        .then(async ([, { triggersActionsUi }]) => triggersActionsUi.data),
      alerting,
    });
  }

  public start(core: CoreStart, plugins: StartDeps) {
    // TODO: Follow-up: This is to create an index pattern using the service.
    // Should we be getting this for free with alerts as data?
    this.setIndexPattern = () => {
      setInternalRepository(core.savedObjects.createInternalRepository);
      setIndexPatternsService(
        plugins.data.indexPatterns.indexPatternsServiceFactory,
        core.elasticsearch.client.asInternalUser
      ).then((indexPatternsService) => {
        indexPatternsService.createAndSave(
          {
            title: this.alertsIndexPattern,
            timeFieldName: 'entityDateTime',
          },
          true
        );
      });
    };
  }

  public stop() {}
}
