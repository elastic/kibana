/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  GetOnePackagePolicyResponse,
  GetPackagePoliciesResponse,
  PackagePolicy,
  UpdatePackagePolicy,
  UpdatePackagePolicyResponse,
} from '@kbn/fleet-plugin/common';
import { packagePolicyRouteService } from '@kbn/fleet-plugin/common';
import type { UserAuthzAccessLevel } from './types';
import { APP_POLICIES_PATH } from '../../../../common/constants';
import type { PolicyConfig } from '../../../../common/endpoint/types';
import { loadPage, request } from '../tasks/common';
import { expectAndCloseSuccessToast } from '../tasks/toasts';
import { getNoPrivilegesPage } from './common';

/**
 * Loads the Policy details page - either for the `policyId` provided on input, or if undefined,
 * then the first policy displayed on the Policy List will be opened
 * @param policyId
 */
export const visitPolicyDetailsPage = (policyId?: string) => {
  if (policyId) {
    loadPage(`${APP_POLICIES_PATH}/${policyId}`);
  } else {
    cy.visit(APP_POLICIES_PATH);
    cy.getByTestSubj('policyNameCellLink').eq(0).click({ force: true });
  }
  cy.getByTestSubj('policyDetailsPage').should('exist');
  cy.get('#settings').should('exist'); // waiting for Policy Settings tab
};

export const savePolicyForm = () => {
  cy.getByTestSubj('policyDetailsSaveButton').click();
  cy.getByTestSubj('confirmModalConfirmButton').click();
  expectAndCloseSuccessToast();
};

export const yieldPolicyConfig = (): Cypress.Chainable<PolicyConfig> => {
  return cy
    .url()
    .then((url) => {
      const policyId = url.match(/security\/administration\/policy\/([a-z0-9-]+)/)?.[1];
      expect(policyId).to.not.equal(undefined);

      return policyId;
    })
    .then((policyId: string) => {
      return request<GetOnePackagePolicyResponse>({
        url: `/api/fleet/package_policies/${policyId}`,
      });
    })
    .then((res) => {
      const firstPackagePolicyConfig = res.body.item.inputs[0].config;
      expect(firstPackagePolicyConfig).to.not.equal(undefined);

      const policyConfig: PolicyConfig = firstPackagePolicyConfig?.policy.value;

      return policyConfig;
    });
};

export class PackagePolicyBackupHelper {
  originalPackagePolicy!: PackagePolicy;

  backup() {
    request<GetPackagePoliciesResponse>({
      url: packagePolicyRouteService.getListPath(),
      qs: {
        kuery: 'ingest-package-policies.package.name: endpoint',
      },
    }).then((res) => {
      this.originalPackagePolicy = res.body.items[0];
    });
  }

  restore() {
    const body: UpdatePackagePolicy = {
      name: this.originalPackagePolicy.name,
      namespace: this.originalPackagePolicy.namespace,
      enabled: this.originalPackagePolicy.enabled,
      inputs: this.originalPackagePolicy.inputs,
      policy_id: this.originalPackagePolicy.policy_id,
    };

    request<UpdatePackagePolicyResponse>({
      method: 'PUT',
      url: packagePolicyRouteService.getUpdatePath(this.originalPackagePolicy.id),
      body,
    });
  }
}

export const ensurePolicyDetailsPageAuthzAccess = (
  policyId: string,
  accessLevel: UserAuthzAccessLevel,
  visitPage: boolean = false
): Cypress.Chainable => {
  if (visitPage) {
    visitPolicyDetailsPage(policyId);
  }

  if (accessLevel === 'none') {
    return getNoPrivilegesPage().should('exist');
  }

  if (accessLevel === 'read') {
    return cy.getByTestSubj('policyDetailsSaveButton').should('not.exist');
  }

  return cy.getByTestSubj('policyDetailsSaveButton').should('exist');
};
