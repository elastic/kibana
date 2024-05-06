/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { useSecuritySolutionNavigation } from './use_security_solution_navigation';

jest.mock('../breadcrumbs', () => ({
  useBreadcrumbsNav: () => jest.fn(),
}));

const mockIsSideNavEnabled = jest.fn(() => true);
jest.mock('../../../lib/kibana/kibana_react', () => {
  return {
    useKibana: () => ({
      services: {
        configSettings: {
          sideNavEnabled: mockIsSideNavEnabled(),
        },
      },
    }),
  };
});

describe('Security Solution Navigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return proper navigation props', () => {
    const { result } = renderHook(useSecuritySolutionNavigation);
    expect(result.current).toEqual(
      expect.objectContaining({
        canBeCollapsed: true,
        name: 'Security',
        icon: 'logoSecurity',
        closeFlyoutButtonPosition: 'inside',
      })
    );
    expect(result.current?.children).toBeDefined();
  });

  it('should return undefined props when disabled', () => {
    mockIsSideNavEnabled.mockReturnValueOnce(false);
    const { result } = renderHook(useSecuritySolutionNavigation);
    expect(result.current).toEqual(undefined);
  });
});
