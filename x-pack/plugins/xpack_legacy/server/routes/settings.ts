/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { Observable } from 'rxjs';
import { first } from 'rxjs/operators';

import { IRouter, ServiceStatus, ServiceStatusLevels } from '../../../../../src/core/server';
import { UsageCollectionSetup } from '../../../../../src/plugins/usage_collection/server';
import { KIBANA_SETTINGS_TYPE } from '../../../monitoring/common/constants';
import { KibanaSettingsCollector } from '../../../monitoring/server';

const SNAPSHOT_REGEX = /-snapshot/i;

export function registerSettingsRoute({
  router,
  usageCollection,
  overallStatus$,
  config,
}: {
  router: IRouter;
  usageCollection: UsageCollectionSetup;
  overallStatus$: Observable<ServiceStatus>;
  config: {
    kibanaIndex: string;
    kibanaVersion: string;
    uuid: string;
    server: {
      name: string;
      hostname: string;
      port: number;
    };
  };
}) {
  router.get(
    {
      path: '/api/settings',
      validate: false,
    },
    async (context, req, res) => {
      const { callAsCurrentUser } = context.core.elasticsearch.legacy.client;
      const collectorFetchContext = {
        callCluster: callAsCurrentUser,
        esClient: context.core.elasticsearch.client.asCurrentUser,
        soClient: context.core.savedObjects.client,
      };

      const settingsCollector = usageCollection.getCollectorByType(KIBANA_SETTINGS_TYPE) as
        | KibanaSettingsCollector
        | undefined;
      if (!settingsCollector) {
        return res.internalError();
      }

      const settings =
        (await settingsCollector.fetch(collectorFetchContext)) ??
        settingsCollector.getEmailValueStructure(null);
      const { cluster_uuid: uuid } = await callAsCurrentUser('info', {
        filterPath: 'cluster_uuid',
      });

      const overallStatus = await overallStatus$.pipe(first()).toPromise();

      const kibana = {
        uuid: config.uuid,
        name: config.server.name,
        index: config.kibanaIndex,
        host: config.server.hostname,
        port: config.server.port,
        locale: i18n.getLocale(),
        transport_address: `${config.server.hostname}:${config.server.port}`,
        version: config.kibanaVersion.replace(SNAPSHOT_REGEX, ''),
        snapshot: SNAPSHOT_REGEX.test(config.kibanaVersion),
        status: ServiceStatusToLegacyState[overallStatus.level.toString()],
      };

      return res.ok({
        body: {
          cluster_uuid: uuid,
          settings: {
            ...settings,
            kibana,
          },
        },
      });
    }
  );
}

const ServiceStatusToLegacyState: Record<string, string> = {
  [ServiceStatusLevels.critical.toString()]: 'red',
  [ServiceStatusLevels.unavailable.toString()]: 'red',
  [ServiceStatusLevels.degraded.toString()]: 'yellow',
  [ServiceStatusLevels.available.toString()]: 'green',
};
