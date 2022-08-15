/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';
import { ThreatIntelligenceSecuritySolutionContext } from '../../types';
import { SecuritySolutionContext } from '../security_solution_context';
import { EnterpriseGuard } from './enterprise_guard';

describe('<EnterpriseGuard />', () => {
  describe('when on enterprise plan', () => {
    it('should render specified children', () => {
      render(
        <SecuritySolutionContext.Provider
          value={
            {
              licenseService: { isEnterprise: jest.fn().mockReturnValue(true) },
            } as unknown as ThreatIntelligenceSecuritySolutionContext
          }
        >
          <EnterpriseGuard>
            <div>enterprise only content</div>
          </EnterpriseGuard>
        </SecuritySolutionContext.Provider>
      );

      expect(screen.queryByText('enterprise only content')).toBeInTheDocument();
    });
  });

  describe('when not on enterprise plan', () => {
    it('should render specified children', () => {
      render(
        <SecuritySolutionContext.Provider
          value={
            {
              licenseService: { isEnterprise: jest.fn().mockReturnValue(false) },
            } as unknown as ThreatIntelligenceSecuritySolutionContext
          }
        >
          <EnterpriseGuard fallback={<div>fallback for non enterprise</div>}>
            <div>enterprise only content</div>
          </EnterpriseGuard>
        </SecuritySolutionContext.Provider>
      );

      expect(screen.queryByText('enterprise only content')).not.toBeInTheDocument();
      expect(screen.queryByText('fallback for non enterprise')).toBeInTheDocument();
    });
  });
});
