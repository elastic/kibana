/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { first } from 'rxjs/operators';
import { schema } from '@kbn/config-schema';
import { i18n } from '@kbn/i18n';

import {
  PluginInitializerContext,
  CoreStart,
  CoreSetup,
  Plugin,
} from '../../../../src/core/server';
import { UsageCollectionSetup } from '../../../../src/plugins/usage_collection/server';
import { registerSettingsRoute } from './routes/settings';

interface SetupPluginDeps {
  usageCollection: UsageCollectionSetup;
}

export class XpackLegacyPlugin implements Plugin {
  constructor(private readonly initContext: PluginInitializerContext) {}

  public async setup(core: CoreSetup, { usageCollection }: SetupPluginDeps) {
    const router = core.http.createRouter();
    const globalConfig = await this.initContext.config.legacy.globalConfig$
      .pipe(first())
      .toPromise();
    const serverInfo = core.http.getServerInfo();

    registerSettingsRoute({
      router,
      usageCollection,
      overallStatus$: core.status.overall$,
      config: {
        kibanaIndex: globalConfig.kibana.index,
        kibanaVersion: this.initContext.env.packageInfo.version,
        uuid: this.initContext.env.instanceUuid,
        server: serverInfo,
      },
    });

    core.uiSettings.register({
      'xPack:defaultAdminEmail': {
        name: i18n.translate('xpack.main.uiSettings.adminEmailTitle', {
          defaultMessage: 'Admin email',
        }),
        description: i18n.translate('xpack.main.uiSettings.adminEmailDescription', {
          defaultMessage:
            'Recipient email address for X-Pack admin operations, such as Cluster Alert email notifications from Monitoring.',
        }),
        deprecation: {
          message: i18n.translate('xpack.main.uiSettings.adminEmailDeprecation', {
            defaultMessage:
              'This setting is deprecated and will not be supported in Kibana 8.0. Please configure `monitoring.cluster_alerts.email_notifications.email_address` in your kibana.yml settings.',
          }),
          docLinksKey: 'kibanaGeneralSettings',
        },
        type: 'string',
        value: null,
        schema: schema.maybe(schema.nullable(schema.string())),
      },
    });
  }

  public start(core: CoreStart) {}

  public stop() {}
}
