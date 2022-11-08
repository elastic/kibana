/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Deletes all existing Fleet packages, package policies and agent policies.
 */
export const cleanFleet = () => {
  // NOTE: order does matter.
  return deletePackagePolicies()
    .then(() => {
      deletePackages();
    })
    .then(() => {
      deleteAgentPolicies();
    });
};

const deleteAgentPolicies = () => {
  return cy
    .request({
      method: 'GET',
      url: 'api/fleet/agent_policies',
      headers: { 'kbn-xsrf': 'cypress-creds' },
    })
    .then((response) => {
      response.body.items.forEach((item: { id: string }) => {
        cy.request({
          method: 'POST',
          url: `api/fleet/agent_policies/delete`,
          headers: { 'kbn-xsrf': 'cypress-creds' },
          body: {
            agentPolicyId: item.id,
          },
        });
      });
    });
};

const deletePackagePolicies = () => {
  return cy
    .request({
      method: 'GET',
      url: 'api/fleet/package_policies',
      headers: { 'kbn-xsrf': 'cypress-creds' },
    })
    .then((response) => {
      cy.request({
        method: 'POST',
        url: `api/fleet/package_policies/delete`,
        headers: { 'kbn-xsrf': 'cypress-creds' },
        body: {
          packagePolicyIds: response.body.items.map((item: { id: string }) => item.id),
        },
      });
    });
};

const deletePackages = () => {
  return cy
    .request({
      method: 'GET',
      url: 'api/fleet/epm/packages',
      headers: { 'kbn-xsrf': 'cypress-creds' },
    })
    .then((response) => {
      response.body.items.forEach((item: { status: string; name: string; version: string }) => {
        if (item.status === 'installed') {
          cy.request({
            method: 'DELETE',
            url: `api/fleet/epm/packages/${item.name}/${item.version}`,
            headers: { 'kbn-xsrf': 'cypress-creds' },
          });
        }
      });
    });
};
