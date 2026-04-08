/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import apmAgent from 'elastic-apm-node';

import type { Plugin, CoreSetup } from '@kbn/core/server';
import type { AlertingServerSetup } from '@kbn/alerting-plugin/server/plugin';
import type { EncryptedSavedObjectsPluginStart } from '@kbn/encrypted-saved-objects-plugin/server';
import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';

export interface FixtureSetupDeps {
  features: FeaturesPluginSetup;
  alerting: AlertingServerSetup;
}

export interface FixtureStartDeps {
  encryptedSavedObjects: EncryptedSavedObjectsPluginStart;
  security?: SecurityPluginStart;
  spaces?: SpacesPluginStart;
}

const alertingFeatures = [
  { ruleTypeId: 'test.executionContext', consumers: ['fecAlertsTestPlugin'] },
];

export class FixturePlugin implements Plugin<void, void, FixtureSetupDeps, FixtureStartDeps> {
  constructor() {}

  public setup(core: CoreSetup<FixtureStartDeps>, { features, alerting }: FixtureSetupDeps) {
    features.registerKibanaFeature({
      id: 'fecAlertsTestPlugin',
      name: 'Alerts',
      app: ['alerts', 'kibana'],
      category: { id: 'foo', label: 'foo' },
      alerting: alertingFeatures,
      privileges: {
        all: {
          app: ['alerts', 'kibana'],
          savedObject: {
            all: ['alert'],
            read: [],
          },
          alerting: {
            rule: {
              all: alertingFeatures,
              enable: alertingFeatures,
              manual_run: alertingFeatures,
              manage_rule_settings: alertingFeatures,
            },
          },
          ui: [],
        },
        read: {
          app: ['alerts', 'kibana'],
          savedObject: {
            all: [],
            read: ['alert'],
          },
          alerting: {
            rule: {
              read: alertingFeatures,
            },
          },
          ui: [],
        },
      },
    });

    alerting.registerType({
      id: 'test.executionContext',
      name: 'Test: Query Elasticsearch server',
      actionGroups: [
        {
          id: 'default',
          name: 'Default',
        },
      ],
      category: 'kibana',
      producer: 'fecAlertsTestPlugin',
      solution: 'stack',
      defaultActionGroupId: 'default',
      minimumLicenseRequired: 'basic',
      isExportable: true,
      async executor() {
        const [coreStart] = await core.getStartServices();
        await coreStart.elasticsearch.client.asInternalUser.ping();
        return { state: {} };
      },
      validate: {
        params: { validate: (params) => params },
      },
    });

    const router = core.http.createRouter();
    router.get(
      {
        path: '/emit_log_with_trace_id',
        security: {
          authc: {
            enabled: false,
            reason: 'This route is part of a test plugin and does not require authentication.',
          },
          authz: {
            enabled: false,
            reason: 'This route is opted out from authorization',
          },
        },
        validate: false,
      },
      async (ctx, req, res) => {
        const coreCtx = await ctx.core;
        await coreCtx.elasticsearch.client.asInternalUser.ping();

        return res.ok({
          body: {
            traceId: apmAgent.currentTraceIds['trace.id'],
          },
        });
      }
    );
  }

  public start() {}
  public stop() {}
}
