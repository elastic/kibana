/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  SavedObjectsClientContract,
  SavedObjectsFindResult,
} from '@kbn/core-saved-objects-api-server';
import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import moment from 'moment';
import { SUMMARY_FILTER } from '../../../common/constants/client_defaults';
import { formatFilterString } from '../common';
import { SyntheticsServerSetup } from '../../types';
import { getSyntheticsCerts } from '../../queries/get_certs';
import { TLSParams } from '../../../common/runtime_types/alerts/tls';
import { savedObjectsAdapter } from '../../saved_objects';
import { DYNAMIC_SETTINGS_DEFAULTS, SYNTHETICS_INDEX_PATTERN } from '../../../common/constants';
import {
  getAllMonitors,
  processMonitors,
} from '../../saved_objects/synthetics_monitor/get_all_monitors';
import { CertResult, EncryptedSyntheticsMonitor, Ping } from '../../../common/runtime_types';
import { SyntheticsMonitorClient } from '../../synthetics_service/synthetics_monitor/synthetics_monitor_client';
import { monitorAttributes } from '../../../common/types/saved_objects';
import { AlertConfigKey } from '../../../common/constants/monitor_management';
import { UptimeEsClient } from '../../lib';

export class TLSRuleExecutor {
  previousStartedAt: Date | null;
  params: TLSParams;
  esClient: UptimeEsClient;
  soClient: SavedObjectsClientContract;
  server: SyntheticsServerSetup;
  syntheticsMonitorClient: SyntheticsMonitorClient;
  monitors: Array<SavedObjectsFindResult<EncryptedSyntheticsMonitor>> = [];

  constructor(
    previousStartedAt: Date | null,
    p: TLSParams,
    soClient: SavedObjectsClientContract,
    scopedClient: ElasticsearchClient,
    server: SyntheticsServerSetup,
    syntheticsMonitorClient: SyntheticsMonitorClient
  ) {
    this.previousStartedAt = previousStartedAt;
    this.params = p;
    this.soClient = soClient;
    this.esClient = new UptimeEsClient(this.soClient, scopedClient, {
      heartbeatIndices: SYNTHETICS_INDEX_PATTERN,
    });
    this.server = server;
    this.syntheticsMonitorClient = syntheticsMonitorClient;
  }

  async getMonitors() {
    this.monitors = await getAllMonitors({
      soClient: this.soClient,
      filter: `${monitorAttributes}.${AlertConfigKey.TLS_ENABLED}: true`,
    });

    const {
      allIds,
      enabledMonitorQueryIds,
      listOfLocations,
      monitorLocationMap,
      projectMonitorsCount,
      monitorQueryIdToConfigIdMap,
    } = await processMonitors(
      this.monitors,
      this.server,
      this.soClient,
      this.syntheticsMonitorClient
    );

    return {
      enabledMonitorQueryIds,
      listOfLocations,
      allIds,
      monitorLocationMap,
      projectMonitorsCount,
      monitorQueryIdToConfigIdMap,
    };
  }

  async getExpiredCertificates() {
    const { enabledMonitorQueryIds } = await this.getMonitors();

    const dynamicSettings = await savedObjectsAdapter.getUptimeDynamicSettings(this.soClient);

    const expiryThreshold =
      this.params.certExpirationThreshold ??
      dynamicSettings?.certExpirationThreshold ??
      DYNAMIC_SETTINGS_DEFAULTS.certExpirationThreshold;

    const ageThreshold =
      this.params.certAgeThreshold ??
      dynamicSettings?.certAgeThreshold ??
      DYNAMIC_SETTINGS_DEFAULTS.certAgeThreshold;

    const absoluteExpirationThreshold = moment().add(expiryThreshold, 'd').valueOf();
    const absoluteAgeThreshold = moment().subtract(ageThreshold, 'd').valueOf();

    if (enabledMonitorQueryIds.length === 0) {
      return {
        certs: [],
        total: 0,
        foundCerts: false,
        expiryThreshold,
        ageThreshold,
        absoluteExpirationThreshold,
        absoluteAgeThreshold,
      };
    }

    let filters: QueryDslQueryContainer | undefined;

    if (this.params.search) {
      filters = await formatFilterString(this.esClient, undefined, this.params.search);
    }

    const { certs, total }: CertResult = await getSyntheticsCerts({
      uptimeEsClient: this.esClient,
      pageIndex: 0,
      size: 1000,
      notValidAfter: `now+${expiryThreshold}d`,
      notValidBefore: `now-${ageThreshold}d`,
      sortBy: 'common_name',
      direction: 'desc',
      filters,
      monitorIds: enabledMonitorQueryIds,
    });

    const latestPings = await this.getLatestPingsForMonitors(certs);

    const foundCerts = total > 0;

    return {
      latestPings,
      foundCerts,
      certs,
      total,
      expiryThreshold,
      ageThreshold,
      absoluteExpirationThreshold,
      absoluteAgeThreshold,
    };
  }
  async getLatestPingsForMonitors(certs: CertResult['certs']) {
    if (certs.length === 0) {
      return [];
    }
    const configIds = certs.map((cert) => cert.configId);
    const certIds = certs.map((cert) => cert.sha256);
    const { body } = await this.esClient.search({
      body: {
        query: {
          bool: {
            filter: [
              {
                terms: {
                  config_id: configIds,
                },
              },
              SUMMARY_FILTER,
            ],
            must_not: {
              bool: {
                filter: [
                  {
                    terms: {
                      'tls.server.hash.sha256': certIds,
                    },
                  },
                ],
              },
            },
          },
        },
        collapse: {
          field: 'config_id',
        },
        _source: [
          '@timestamp',
          'monitor.id',
          'monitor.name',
          'url.full',
          'monitor.type',
          'config_id',
          'tls.server.hash.sha256',
        ],
        sort: [
          {
            '@timestamp': {
              order: 'desc',
            },
          },
        ],
      },
    });

    return body.hits.hits.map((hit) => hit._source as Ping);
  }
}
