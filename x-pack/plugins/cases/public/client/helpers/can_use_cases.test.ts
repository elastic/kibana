/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApplicationStart } from '@kbn/core/public';
import { canUseCases } from './can_use_cases';

type CasesCapabilities = Pick<
  ApplicationStart['capabilities'],
  'securitySolutionCases' | 'observabilityCases'
>;

const hasAll: CasesCapabilities = {
  securitySolutionCases: {
    crud_cases: true,
    read_cases: true,
  },
  observabilityCases: {
    crud_cases: true,
    read_cases: true,
  },
};

const hasNone: CasesCapabilities = {
  securitySolutionCases: {
    crud_cases: false,
    read_cases: false,
  },
  observabilityCases: {
    crud_cases: false,
    read_cases: false,
  },
};

const hasSecurity = {
  securitySolutionCases: {
    crud_cases: true,
    read_cases: true,
  },
  observabilityCases: {
    crud_cases: false,
    read_cases: false,
  },
};

const hasObservability = {
  securitySolutionCases: {
    crud_cases: false,
    read_cases: false,
  },
  observabilityCases: {
    crud_cases: true,
    read_cases: true,
  },
};

const hasObservabilityCrudTrue = {
  securitySolutionCases: {
    crud_cases: false,
    read_cases: false,
  },
  observabilityCases: {
    crud_cases: true,
    read_cases: false,
  },
};

const hasSecurityCrudTrue = {
  securitySolutionCases: {
    crud_cases: false,
    read_cases: false,
  },
  observabilityCases: {
    crud_cases: true,
    read_cases: false,
  },
};

const hasObservabilityReadTrue = {
  securitySolutionCases: {
    crud_cases: false,
    read_cases: false,
  },
  observabilityCases: {
    crud_cases: false,
    read_cases: true,
  },
};

const hasSecurityReadTrue = {
  securitySolutionCases: {
    crud_cases: false,
    read_cases: true,
  },
  observabilityCases: {
    crud_cases: false,
    read_cases: false,
  },
};

const hasSecurityAsCrudAndObservabilityAsRead = {
  securitySolutionCases: {
    crud_cases: true,
  },
  observabilityCases: {
    read_cases: true,
  },
};

describe('canUseCases', () => {
  it.each([hasAll, hasSecurity, hasObservability, hasSecurityAsCrudAndObservabilityAsRead])(
    'returns true for both crud and read, if a user has access to both on any solution',
    (capability) => {
      const permissions = canUseCases(capability)();
      expect(permissions).toStrictEqual({ crud: true, read: true });
    }
  );

  it.each([hasObservabilityCrudTrue, hasSecurityCrudTrue])(
    'returns true for only crud, if a user has access to only crud on any solution',
    (capability) => {
      const permissions = canUseCases(capability)();
      expect(permissions).toStrictEqual({ crud: true, read: false });
    }
  );

  it.each([hasObservabilityReadTrue, hasSecurityReadTrue])(
    'returns true for only read, if a user has access to only read on any solution',
    (capability) => {
      const permissions = canUseCases(capability)();
      expect(permissions).toStrictEqual({ crud: false, read: true });
    }
  );

  it.each([hasNone, {}])(
    'returns false for both, if a user has access to no solution',
    (capability) => {
      const permissions = canUseCases(capability)();
      expect(permissions).toStrictEqual({ crud: false, read: false });
    }
  );
});
