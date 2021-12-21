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
  Logger,
  SavedObjectsServiceStart,
} from 'src/core/server';
import { PackagePolicy, PACKAGE_POLICY_SAVED_OBJECT_TYPE } from '../../../../../fleet/common';
import { PackagePolicyServiceInterface } from '../../../../../fleet/server';
import { ILicense } from '../../../../../licensing/common/types';
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
        response = await this.policyService.list(this.soStart.createInternalRepository(), {
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
                this.soStart.createInternalRepository(),
                this.esClient,
                policy.id,
                updatePolicy
              );
            } catch (e) {
              // try again for transient issues
              try {
                await this.policyService.update(
                  this.soStart.createInternalRepository(),
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
