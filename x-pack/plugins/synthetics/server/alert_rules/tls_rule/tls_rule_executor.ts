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
import { getSyntheticsCerts } from '../../queries/get_certs';
import { TLSParams } from '../../../common/runtime_types/alerts/tls';
import { savedObjectsAdapter } from '../../legacy_uptime/lib/saved_objects';
import { DYNAMIC_SETTINGS_DEFAULTS, SYNTHETICS_INDEX_PATTERN } from '../../../common/constants';
import {
  getAllMonitors,
  processMonitors,
} from '../../saved_objects/synthetics_monitor/get_all_monitors';
import { UptimeEsClient } from '../../legacy_uptime/lib/lib';
import { CertResult, EncryptedSyntheticsMonitor } from '../../../common/runtime_types';
import { SyntheticsMonitorClient } from '../../synthetics_service/synthetics_monitor/synthetics_monitor_client';
import { UptimeServerSetup } from '../../legacy_uptime/lib/adapters';
import { monitorAttributes } from '../../../common/types/saved_objects';
import { AlertConfigKey } from '../../../common/constants/monitor_management';
import { formatFilterString } from '../../legacy_uptime/lib/alerts/status_check';

export class TLSRuleExecutor {
  previousStartedAt: Date | null;
  params: TLSParams;
  esClient: UptimeEsClient;
  soClient: SavedObjectsClientContract;
  server: UptimeServerSetup;
  syntheticsMonitorClient: SyntheticsMonitorClient;
  monitors: Array<SavedObjectsFindResult<EncryptedSyntheticsMonitor>> = [];

  constructor(
    previousStartedAt: Date | null,
    p: TLSParams,
    soClient: SavedObjectsClientContract,
    scopedClient: ElasticsearchClient,
    server: UptimeServerSetup,
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

    const foundCerts = total > 0;

    return {
      foundCerts,
      certs,
      total,
      expiryThreshold,
      ageThreshold,
      absoluteExpirationThreshold,
      absoluteAgeThreshold,
    };
  }
}
