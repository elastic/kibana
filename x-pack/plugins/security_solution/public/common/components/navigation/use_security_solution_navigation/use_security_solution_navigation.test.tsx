/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, renderHook } from '@testing-library/react';
import { of } from 'rxjs';
import { useSecuritySolutionNavigation } from './use_security_solution_navigation';

const mockUseBreadcrumbsNav = jest.fn();
jest.mock('../breadcrumbs', () => ({
  useBreadcrumbsNav: () => mockUseBreadcrumbsNav(),
}));

const mockSecuritySideNav = jest.fn(() => <div data-test-subj="SecuritySideNav" />);
jest.mock('../security_side_nav', () => ({
  SecuritySideNav: () => mockSecuritySideNav(),
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
  describe('while chrome style is undefined', () => {
    beforeAll(() => {
      mockGetChromeStyle$.mockReturnValue(of());
    });

    it('should return proper navigation props', async () => {
      const { result } = renderHook(useSecuritySolutionNavigation);
      expect(result.current).toEqual(undefined);

      // check rendering of SecuritySideNav children
      expect(mockSecuritySideNav).not.toHaveBeenCalled();
    });
  });

  describe('when classic navigation is enabled', () => {
    beforeAll(() => {
      mockGetChromeStyle$.mockReturnValue(of('classic'));
    });

    it('should return proper navigation props', async () => {
      const { result } = renderHook(useSecuritySolutionNavigation);
      expect(result.current).toEqual(
        expect.objectContaining({
          canBeCollapsed: true,
          name: 'Security',
          icon: 'logoSecurity',
          closeFlyoutButtonPosition: 'inside',
        })
      );

      // check regular props
      expect(result.current).toEqual({
        canBeCollapsed: true,
        name: 'Security',
        icon: 'logoSecurity',
        children: expect.anything(),
        closeFlyoutButtonPosition: 'inside',
      });

      // check rendering of SecuritySideNav children
      const { findByTestId } = render(<>{result.current?.children}</>);

      expect(mockSecuritySideNav).toHaveBeenCalled();
      expect(await findByTestId('SecuritySideNav')).toBeInTheDocument();
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

    it('should return null props when disabled', () => {
      const { result } = renderHook(useSecuritySolutionNavigation);
      expect(result.current).toEqual(null);
    });

    it('should initialize breadcrumbs', () => {
      renderHook(useSecuritySolutionNavigation);
      expect(mockUseBreadcrumbsNav).toHaveBeenCalled();
    });
  });
});
