/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Logger } from '../../../../../../../src/core/server';
import { PACKAGE_POLICY_SAVED_OBJECT_TYPE } from '../../../../../fleet/common';
import { PackagePolicyServiceInterface } from '../../../../../fleet/server';
import { PolicyConfig } from '../../../../common/endpoint/types';
import { ILicense } from '../../../../../licensing/common/types';
import { isEndpointPolicyValidForLicense } from '../../../../common/license/policy_check';
import { licenseService } from '../../../lib/license/license';

export class PolicyWatcher {
  private logger: Logger;
  private policyService?: PackagePolicyServiceInterface;
  constructor(policyService: PackagePolicyServiceInterface, logger: Logger) {
    this.policyService = policyService;
    this.logger = logger;
  }

  public async watch(license: ILicense) {
    let packagePolicies;
    if (!this.policyService) {
      this.logger.debug(
        'unable to verify endpoint policies to license change: no package policy service'
      );
      return;
    }

    // @todo: need a SO client
    try {
      packagePolicies = await this.policyService.list(null, {
        perPage: 100,
        kuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name: endpoint`,
      });
    } catch (e) {
      this.logger.warn(
        `Unable to verify endpoint policies in line with license change: failed to fetch package policies: ${e.message}`
      );
    }

    // fetch ALL endpoint policies
    const policies: PolicyConfig[] = [];

    for (const policy of policies) {
      const valid = isEndpointPolicyValidForLicense(policy, licenseService);
      if (!valid) {
        // alter the policy
      }
    }
  }
}
