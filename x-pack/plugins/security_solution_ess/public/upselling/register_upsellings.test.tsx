/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SecurityPageName } from '@kbn/security-solution-plugin/common';

import { upsellingPages } from './register_upsellings';

describe('upsellingPages', () => {
  it('registers the Attack discovery page with the expected minimum license for self managed', () => {
    const attackDiscoveryPage = upsellingPages.find(
      ({ pageName }) => pageName === SecurityPageName.attackDiscovery
    );

    expect(attackDiscoveryPage?.minimumLicenseRequired).toEqual('enterprise');
  });
});
