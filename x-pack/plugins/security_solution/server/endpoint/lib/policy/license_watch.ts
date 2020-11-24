/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  KibanaRequest,
  Logger,
  SavedObjectsClientContract,
  SavedObjectsServiceStart,
} from 'src/core/server';
import { PackagePolicy, PACKAGE_POLICY_SAVED_OBJECT_TYPE } from '../../../../../fleet/common';
import { PackagePolicyServiceInterface } from '../../../../../fleet/server';
import { ILicense } from '../../../../../licensing/common/types';
import {
  isEndpointPolicyValidForLicense,
  unsetPolicyFeaturesAboveLicenseLevel,
} from '../../../../common/license/policy_config';
import { licenseService } from '../../../lib/license/license';

export class PolicyWatcher {
  private logger: Logger;
  private soClient: SavedObjectsClientContract;
  private policyService?: PackagePolicyServiceInterface;
  constructor(
    policyService: PackagePolicyServiceInterface,
    soStart: SavedObjectsServiceStart,
    logger: Logger
  ) {
    this.policyService = policyService;
    this.soClient = this.makeInternalSOClient(soStart);
    this.logger = logger;
  }

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

  public async watch(license: ILicense) {
    let packagePolicies: PackagePolicy[];
    if (!this.policyService) {
      this.logger.debug(
        'unable to verify endpoint policies to license change: no package policy service'
      );
      return;
    }

    try {
      packagePolicies = (
        await this.policyService.list(this.soClient, {
          perPage: 100,
          kuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name: endpoint`,
        })
      ).items;
    } catch (e) {
      this.logger.warn(
        `Unable to verify endpoint policies in line with license change: failed to fetch package policies: ${e.message}`
      );
      return;
    }

    for (const policy of packagePolicies) {
      const policyConfig = policy.inputs[0].config?.policy.value;
      const valid = isEndpointPolicyValidForLicense(policyConfig, licenseService);
      if (!valid) {
        policy.inputs[0].config!.policy.value = unsetPolicyFeaturesAboveLicenseLevel(
          policyConfig,
          licenseService
        );
        this.policyService.update(this.soClient, policy.id, policy);
      }
    }
  }
}
