/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GetOnePackagePolicyResponse } from '@kbn/fleet-plugin/common';
import type { PolicyConfig } from '../../../../common/endpoint/types';
import { POLICIES_URL } from '../../../../cypress/urls/navigation';
import { request } from '../tasks/common';

export const visitPolicyDetailsPage = () => {
  cy.visit(POLICIES_URL);

  cy.getByTestSubj('policyNameCellLink').eq(0).click({ force: true });
  cy.getByTestSubj('policyDetailsPage').should('exist');
  cy.get('#settings').should('exist'); // waiting for Policy Settings tab
};

export const checkMalwareUserNotificationInOpenedPolicy = ({
  isEnabled,
}: {
  isEnabled: boolean;
}) => {
  cy.url()
    .then((url) => {
      const policyId = url.match(/security\/administration\/policy\/([a-z0-9-]+)/)?.[1];
      expect(policyId).to.not.equal(undefined);

      return policyId;
    })
    .then((policyId: string) => {
      request<GetOnePackagePolicyResponse>({
        url: `/api/fleet/package_policies/${policyId}`,
      }).then((res) => {
        const firstPackagePolicyConfig = res.body.item.inputs[0].config;
        expect(firstPackagePolicyConfig).to.not.equal(undefined);

        const policyConfig: PolicyConfig = firstPackagePolicyConfig?.policy.value;
        expect(policyConfig.mac.popup.malware.enabled).to.equal(isEnabled);
        expect(policyConfig.windows.popup.malware.enabled).to.equal(isEnabled);
        expect(policyConfig.linux.popup.malware.enabled).to.equal(isEnabled);
      });
    });
};
