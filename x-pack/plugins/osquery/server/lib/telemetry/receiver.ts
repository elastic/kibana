/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  Logger,
  CoreStart,
  ElasticsearchClient,
  SavedObjectsClientContract,
} from '@kbn/core/server';

import type {
  AgentClient,
  AgentPolicyServiceInterface,
  PackageService,
  PackagePolicyClient,
} from '@kbn/fleet-plugin/server';
import { PACKAGE_POLICY_SAVED_OBJECT_TYPE } from '@kbn/fleet-plugin/common';
import { OSQUERY_INTEGRATION_NAME } from '../../../common';
import { packSavedObjectType, savedQuerySavedObjectType } from '../../../common/types';
import type { OsqueryAppContextService } from '../osquery_app_context_services';
import type {
  PackSavedObjectAttributes,
  SavedQuerySavedObjectAttributes,
} from '../../common/types';
import { getPrebuiltSavedQueryIds } from '../../routes/saved_query/utils';

export class TelemetryReceiver {
  // @ts-expect-error used as part of this
  private readonly logger: Logger;
  private agentClient?: AgentClient;
  private agentPolicyService?: AgentPolicyServiceInterface;
  private packageService?: PackageService;
  private packagePolicyService?: PackagePolicyClient;
  private esClient?: ElasticsearchClient;
  private soClient?: SavedObjectsClientContract;
  private readonly max_records = 100;

  constructor(logger: Logger) {
    this.logger = logger.get('telemetry_events');
  }

  public async start(core: CoreStart, osqueryContextService?: OsqueryAppContextService) {
    this.agentClient = osqueryContextService?.getAgentService()?.asInternalUser;
    this.agentPolicyService = osqueryContextService?.getAgentPolicyService();
    this.packageService = osqueryContextService?.getPackageService();
    this.packagePolicyService = osqueryContextService?.getPackagePolicyService();
    this.esClient = core.elasticsearch.client.asInternalUser;
    this.soClient =
      core.savedObjects.createInternalRepository() as unknown as SavedObjectsClientContract;
  }

  public async fetchPacks() {
    return this.soClient?.find<PackSavedObjectAttributes>({
      type: packSavedObjectType,
      page: 1,
      perPage: this.max_records,
      sortField: 'updated_at',
      sortOrder: 'desc',
    });
  }

  public async fetchSavedQueries() {
    return this.soClient?.find<SavedQuerySavedObjectAttributes>({
      type: savedQuerySavedObjectType,
      page: 1,
      perPage: this.max_records,
      sortField: 'updated_at',
      sortOrder: 'desc',
    });
  }

  public async fetchConfigs() {
    if (this.soClient) {
      return this.packagePolicyService?.list(this.soClient, {
        kuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name:${OSQUERY_INTEGRATION_NAME}`,
        perPage: 1000,
        page: 1,
      });
    }

    throw Error('elasticsearch client is unavailable: cannot retrieve fleet policy responses');
  }

  public async fetchPrebuiltSavedQueryIds() {
    return getPrebuiltSavedQueryIds(this.packageService?.asInternalUser);
  }

  public async fetchFleetAgents() {
    if (this.esClient === undefined || this.soClient === null) {
      throw Error('elasticsearch client is unavailable: cannot retrieve fleet policy responses');
    }

    return this.agentClient?.listAgents({
      perPage: this.max_records,
      showInactive: true,
      sortField: 'enrolled_at',
      sortOrder: 'desc',
    });
  }

  public async fetchPolicyConfigs(id: string) {
    if (this.soClient === undefined || this.soClient === null) {
      throw Error(
        'saved object client is unavailable: cannot retrieve endpoint policy configurations'
      );
    }

    return this.agentPolicyService?.get(this.soClient, id);
  }
}
