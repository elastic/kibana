/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getInstallPkgRouteOptions } from '.';

// this is always the same
const expectedOnCancelNavigateTo = [
  'integrations',
  {
    path: '/detail/myintegration-1.0.0/overview?integration=myintegration',
  },
];

describe('getInstallPkgRouteOptions', () => {
  it('should redirect to integrations app on save if no agentPolicyId present', () => {
    const opts = {
      currentPath: 'currentPath',
      integration: 'myintegration',
      pkgkey: 'myintegration-1.0.0',
    };

    const expectedRedirectURl = '/detail/myintegration-1.0.0/policies?integration=myintegration';

    const expectedOptions = {
      path: '/integrations/myintegration-1.0.0/add-integration/myintegration',
      state: {
        onCancelUrl: 'currentPath',
        onCancelNavigateTo: expectedOnCancelNavigateTo,
        onSaveNavigateTo: ['integrations', { path: expectedRedirectURl }],
        onSaveQueryParams: {
          showAddAgentHelp: { renameKey: 'showAddAgentHelpForPolicyId', policyIdAsValue: true },
          openEnrollmentFlyout: { renameKey: 'addAgentToPolicyId', policyIdAsValue: true },
        },
      },
    };

    expect(getInstallPkgRouteOptions(opts)).toEqual(['fleet', expectedOptions]);
  });

  it('should redirect to fleet app on save if agentPolicyId present', () => {
    const opts = {
      currentPath: 'currentPath',
      integration: 'myintegration',
      pkgkey: 'myintegration-1.0.0',
      agentPolicyId: '12345',
    };

    const expectedRedirectURl = '/policies/12345';

    const expectedOptions = {
      path: '/integrations/myintegration-1.0.0/add-integration/myintegration?policyId=12345',
      state: {
        onCancelUrl: 'currentPath',
        onCancelNavigateTo: expectedOnCancelNavigateTo,
        onSaveNavigateTo: ['fleet', { path: expectedRedirectURl }],
        onSaveQueryParams: {
          showAddAgentHelp: true,
          openEnrollmentFlyout: true,
        },
      },
    };

    expect(getInstallPkgRouteOptions(opts)).toEqual(['fleet', expectedOptions]);
  });
});
