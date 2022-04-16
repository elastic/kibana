/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Subscription } from 'rxjs';

import {
  ElasticsearchClient,
  ElasticsearchServiceStart,
  KibanaRequest,
  Logger,
  SavedObjectsClientContract,
  SavedObjectsServiceStart,
} from '@kbn/core/server';
import { PackagePolicy, PACKAGE_POLICY_SAVED_OBJECT_TYPE } from '@kbn/fleet-plugin/common';
import { PackagePolicyServiceInterface } from '@kbn/fleet-plugin/server';
import { ILicense } from '@kbn/licensing-plugin/common/types';
import {
  isEndpointPolicyValidForLicense,
  unsetPolicyFeaturesAccordingToLicenseLevel,
} from '../../../../common/license/policy_config';
import { LicenseService } from '../../../../common/license/license';
import { PolicyData } from '../../../../common/endpoint/types';
import { getPolicyDataForUpdate } from '../../../../common/endpoint/service/policy';

export class PolicyWatcher {
  private logger: Logger;
  private esClient: ElasticsearchClient;
  private policyService: PackagePolicyServiceInterface;
  private subscription: Subscription | undefined;
  private soStart: SavedObjectsServiceStart;
  constructor(
    policyService: PackagePolicyServiceInterface,
    soStart: SavedObjectsServiceStart,
    esStart: ElasticsearchServiceStart,
    logger: Logger
  ) {
    this.policyService = policyService;
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
    return soStart.getScopedClient(fakeRequest, { excludedWrappers: ['security'] });
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
      items: PackagePolicy[];
      total: number;
      page: number;
      perPage: number;
    };

    do {
      try {
        response = await this.policyService.list(this.makeInternalSOClient(this.soStart), {
          page: page++,
          perPage: 100,
          kuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name: endpoint`,
        });
      } catch (e) {
        this.logger.warn(
          `Unable to verify endpoint policies in line with license change: failed to fetch package policies: ${e.message}`
        );
        return;
      }

      for (const policy of response.items as PolicyData[]) {
        const updatePolicy = getPolicyDataForUpdate(policy);
        const policyConfig = updatePolicy.inputs[0].config.policy.value;

        try {
          if (!isEndpointPolicyValidForLicense(policyConfig, license)) {
            updatePolicy.inputs[0].config.policy.value = unsetPolicyFeaturesAccordingToLicenseLevel(
              policyConfig,
              license
            );
            try {
              await this.policyService.update(
                this.makeInternalSOClient(this.soStart),
                this.esClient,
                policy.id,
                updatePolicy
              );
            } catch (e) {
              // try again for transient issues
              try {
                await this.policyService.update(
                  this.makeInternalSOClient(this.soStart),
                  this.esClient,
                  policy.id,
                  updatePolicy
                );
              } catch (ee) {
                this.logger.warn(`Unable to remove platinum features from policy ${policy.id}`);
                this.logger.warn(ee);
              }
            }
          }
        } catch (error) {
          this.logger.warn(
            `Failure while attempting to verify Endpoint Policy features for policy [${policy.id}]`
          );
          this.logger.warn(error);
        }
      }
    } while (response.page * response.perPage < response.total);
  }
}
