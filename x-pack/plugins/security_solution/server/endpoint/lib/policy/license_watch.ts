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
} from 'src/core/server';
import {
  PackagePolicy,
  PACKAGE_POLICY_SAVED_OBJECT_TYPE,
  UpdatePackagePolicy,
} from '../../../../../fleet/common';
import { PackagePolicyServiceInterface } from '../../../../../fleet/server';
import { ILicense } from '../../../../../licensing/common/types';
import {
  isEndpointPolicyValidForLicense,
  unsetPolicyFeaturesAccordingToLicenseLevel,
} from '../../../../common/license/policy_config';
import { LicenseService } from '../../../../common/license/license';

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
    const fakeRequest = ({
      headers: {},
      getBasePath: () => '',
      path: '/',
      route: { settings: {} },
      url: { href: {} },
      raw: { req: { url: '/' } },
    } as unknown) as KibanaRequest;
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
      response.items.forEach(async (policy) => {
        const updatePolicy: UpdatePackagePolicy = {
          name: policy.name,
          description: policy.description,
          namespace: policy.namespace,
          enabled: policy.enabled,
          policy_id: policy.policy_id,
          output_id: policy.output_id,
          package: policy.package,
          inputs: policy.inputs,
          version: policy.version,
        };
        const policyConfig = updatePolicy.inputs[0].config?.policy.value;
        if (!isEndpointPolicyValidForLicense(policyConfig, license)) {
          updatePolicy.inputs[0].config!.policy.value = unsetPolicyFeaturesAccordingToLicenseLevel(
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
              this.logger.warn(
                `Unable to remove platinum features from policy ${policy.id}: ${ee.message}`
              );
            }
          }
        }
      });
    } while (response.page * response.perPage < response.total);
  }
}
