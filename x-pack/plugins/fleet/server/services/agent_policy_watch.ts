/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Subscription } from 'rxjs';
import type {
  ElasticsearchClient,
  ElasticsearchServiceStart,
  KibanaRequest,
  Logger,
  SavedObjectsClientContract,
  SavedObjectsServiceStart,
} from '@kbn/core/server';
import { SECURITY_EXTENSION_ID } from '@kbn/core-saved-objects-server';
import type { ILicense } from '@kbn/licensing-plugin/common/types';

import { pick } from 'lodash';

import type { LicenseService } from '../../common/services/license';

import type { AgentPolicy } from '../../common';
import { AGENT_POLICY_SAVED_OBJECT_TYPE } from '../../common';
import {
  isAgentPolicyValidForLicense,
  unsetAgentPolicyAccordingToLicenseLevel,
} from '../../common/services/agent_policy_config';

import { agentPolicyService } from './agent_policy';

export class PolicyWatcher {
  private logger: Logger;
  private esClient: ElasticsearchClient;
  private subscription: Subscription | undefined;
  private soStart: SavedObjectsServiceStart;
  constructor(
    soStart: SavedObjectsServiceStart,
    esStart: ElasticsearchServiceStart,
    logger: Logger
  ) {
    this.esClient = esStart.client.asInternalUser;
    this.logger = logger;
    this.soStart = soStart;
  }

  /**
   * The policy watcher is not called as part of a HTTP request chain, where the
   * request-scoped SOClient could be passed down. It is called via license observable
   * changes. We are acting as the 'system' in response to license changes, so we are
   * intentionally using the system user here. Be very aware of what you are using this
   * client to do
   */
  private makeInternalSOClient(soStart: SavedObjectsServiceStart): SavedObjectsClientContract {
    const fakeRequest = {
      headers: {},
      getBasePath: () => '',
      path: '/',
      route: { settings: {} },
      url: { href: {} },
      raw: { req: { url: '/' } },
    } as unknown as KibanaRequest;
    return soStart.getScopedClient(fakeRequest, { excludedExtensions: [SECURITY_EXTENSION_ID] });
  }

  public start(licenseService: LicenseService) {
    this.subscription = licenseService.getLicenseInformation$()?.subscribe(this.watch.bind(this));
  }

  public stop() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  public async watch(license: ILicense) {
    let page = 1;
    let response: {
      items: AgentPolicy[];
      total: number;
      page: number;
      perPage: number;
    };

    do {
      try {
        response = await agentPolicyService.list(this.makeInternalSOClient(this.soStart), {
          page: page++,
          perPage: 100,
          kuery: AGENT_POLICY_SAVED_OBJECT_TYPE,
        });
      } catch (e) {
        this.logger.warn(
          `Unable to verify agent policies in line with license change: failed to fetch agent policies: ${e.message}`
        );
        return;
      }
      const updatedPolicyIds: string[] = [];
      for (const policy of response.items as AgentPolicy[]) {
        let updatePolicy = pick(policy, ['is_protected']) as Partial<AgentPolicy>;

        try {
          if (!isAgentPolicyValidForLicense(updatePolicy, license)) {
            updatePolicy = unsetAgentPolicyAccordingToLicenseLevel(updatePolicy, license);
            try {
              this.logger.info('Updating agent policies per license change');
              await agentPolicyService.update(
                this.makeInternalSOClient(this.soStart),
                this.esClient,
                policy.id,
                updatePolicy
              );
              // accumulate list of policies updated
              updatedPolicyIds.push(policy.id);
            } catch (e) {
              // try again for transient issues
              try {
                await agentPolicyService.update(
                  this.makeInternalSOClient(this.soStart),
                  this.esClient,
                  policy.id,
                  updatePolicy
                );
              } catch (ee) {
                this.logger.warn(
                  `Unable to remove platinum features from agent policy ${policy.id}`
                );
                this.logger.warn(ee);
              }
            }
          }
        } catch (error) {
          this.logger.warn(
            `Failure while attempting to verify features for agent policy [${policy.id}]`
          );
          this.logger.warn(error);
        }
      }
      this.logger.info(`Agent policies updated by license change: [${updatedPolicyIds.join()}]`);
    } while (response.page * response.perPage < response.total);
  }
}
