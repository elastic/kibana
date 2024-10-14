/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApplicationStart } from '@kbn/core/public';
import {
  allCasesCapabilities,
  allCasesPermissions,
  noCasesCapabilities,
  noCasesPermissions,
  readCasesPermissions,
  readCasesCapabilities,
  writeCasesCapabilities,
  writeCasesPermissions,
} from '../../common/mock';
import { canUseCases } from './can_use_cases';

type CasesCapabilities = Pick<
  ApplicationStart['capabilities'],
  'securitySolutionCasesV2' | 'observabilityCases' | 'generalCases'
>;

const hasAll: CasesCapabilities = {
  securitySolutionCasesV2: allCasesCapabilities(),
  observabilityCases: allCasesCapabilities(),
  generalCases: allCasesCapabilities(),
};

const hasNone: CasesCapabilities = {
  securitySolutionCasesV2: noCasesCapabilities(),
  observabilityCases: noCasesCapabilities(),
  generalCases: noCasesCapabilities(),
};

const hasSecurity: CasesCapabilities = {
  securitySolutionCasesV2: allCasesCapabilities(),
  observabilityCases: noCasesCapabilities(),
  generalCases: noCasesCapabilities(),
};

const hasObservability: CasesCapabilities = {
  securitySolutionCasesV2: noCasesCapabilities(),
  observabilityCases: allCasesCapabilities(),
  generalCases: noCasesCapabilities(),
};

const hasObservabilityWriteTrue: CasesCapabilities = {
  securitySolutionCasesV2: noCasesCapabilities(),
  observabilityCases: writeCasesCapabilities(),
  generalCases: noCasesCapabilities(),
};

const hasSecurityWriteTrue: CasesCapabilities = {
  securitySolutionCasesV2: writeCasesCapabilities(),
  observabilityCases: noCasesCapabilities(),
  generalCases: noCasesCapabilities(),
};

const hasObservabilityReadTrue: CasesCapabilities = {
  securitySolutionCasesV2: noCasesCapabilities(),
  observabilityCases: readCasesCapabilities(),
  generalCases: noCasesCapabilities(),
};

const hasSecurityReadTrue: CasesCapabilities = {
  securitySolutionCasesV2: readCasesCapabilities(),
  observabilityCases: noCasesCapabilities(),
  generalCases: noCasesCapabilities(),
};

const hasSecurityWriteAndObservabilityRead: CasesCapabilities = {
  securitySolutionCasesV2: writeCasesCapabilities(),
  observabilityCases: readCasesCapabilities(),
  generalCases: noCasesCapabilities(),
};

const hasSecurityConnectors: CasesCapabilities = {
  securitySolutionCasesV2: readCasesCapabilities(),
  observabilityCases: noCasesCapabilities(),
  generalCases: noCasesCapabilities(),
};

describe('canUseCases', () => {
  it.each([hasAll, hasSecurity, hasObservability, hasSecurityWriteAndObservabilityRead])(
    'returns true for all permissions, if a user has access to both on any solution',
    (capability) => {
      const permissions = canUseCases(capability)();
      expect(permissions).toStrictEqual(allCasesPermissions());
    }
  );

  it.each([hasObservabilityWriteTrue, hasSecurityWriteTrue])(
    'returns true for only write, if a user has access to only write on any solution',
    (capability) => {
      const permissions = canUseCases(capability)();
      expect(permissions).toStrictEqual(writeCasesPermissions());
    }
  );

  it.each([hasObservabilityReadTrue, hasSecurityReadTrue])(
    'returns true for only read, if a user has access to only read on any solution',
    (capability) => {
      const permissions = canUseCases(capability)();
      expect(permissions).toStrictEqual(readCasesPermissions());
    }
  );

  it.each([hasNone, {}])(
    'returns false for all permissions, if a user has access to no solution',
    (capability) => {
      const permissions = canUseCases(capability)();
      expect(permissions).toStrictEqual(noCasesPermissions());
    }
  );

  it.each([hasSecurityConnectors])(
    'returns true for only connectors, if a user has access to only connectors on any solution',
    (capability) => {
      const permissions = canUseCases(capability)();
      expect(permissions).toStrictEqual(readCasesPermissions());
    }
  );
});
