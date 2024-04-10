/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { of } from 'rxjs';
import { useSecuritySolutionNavigation } from './use_security_solution_navigation';

const mockUseBreadcrumbsNav = jest.fn();
jest.mock('../breadcrumbs', () => ({
  useBreadcrumbsNav: () => mockUseBreadcrumbsNav(),
}));

const mockGetChromeStyle$ = jest.fn().mockReturnValue(of('classic'));
jest.mock('../../../lib/kibana/kibana_react', () => {
  return {
    useKibana: () => ({
      services: { chrome: { getChromeStyle$: () => mockGetChromeStyle$() } },
    }),
  };
});

describe('Security Solution Navigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  describe('when classic navigation is enabled', () => {
    beforeAll(() => {
      mockGetChromeStyle$.mockReturnValue(of('classic'));
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

    it('should initialize breadcrumbs', () => {
      renderHook(useSecuritySolutionNavigation);
      expect(mockUseBreadcrumbsNav).toHaveBeenCalled();
    });
  });

  describe('when solution navigation is enabled', () => {
    beforeAll(() => {
      mockGetChromeStyle$.mockReturnValue(of('project'));
    });

    it('should return undefined props when disabled', () => {
      const { result } = renderHook(useSecuritySolutionNavigation);
      expect(result.current).toEqual(undefined);
    });

    it('should initialize breadcrumbs', () => {
      renderHook(useSecuritySolutionNavigation);
      expect(mockUseBreadcrumbsNav).toHaveBeenCalled();
    });
  });
});
