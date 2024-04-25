/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { addPathParamToUrl, toOnboardingPath } from './use_integration_card_list';

describe('useIntegratrionCardList', () => {
  describe('toOnboardingPath', () => {
    it('returns null if no `basePath` is defined', () => {
      expect(toOnboardingPath({})).toBeNull();
    });
    it('returns just the `basePath` if no category or search is defined', () => {
      expect(toOnboardingPath({ basePath: '' })).toBe('/app/experimental-onboarding');
      expect(toOnboardingPath({ basePath: '/s/custom_space_name' })).toBe(
        '/s/custom_space_name/app/experimental-onboarding'
      );
    });
    it('includes category in the URL', () => {
      expect(toOnboardingPath({ basePath: '/s/custom_space_name', category: 'logs' })).toBe(
        '/s/custom_space_name/app/experimental-onboarding?category=logs'
      );
      expect(toOnboardingPath({ basePath: '', category: 'infra' })).toBe(
        '/app/experimental-onboarding?category=infra'
      );
    });
    it('includes search in the URL', () => {
      expect(toOnboardingPath({ basePath: '/s/custom_space_name', search: 'search' })).toBe(
        '/s/custom_space_name/app/experimental-onboarding?search=search'
      );
    });
    it('includes category and search in the URL', () => {
      expect(
        toOnboardingPath({ basePath: '/s/custom_space_name', category: 'logs', search: 'search' })
      ).toBe('/s/custom_space_name/app/experimental-onboarding?category=logs&search=search');
      expect(toOnboardingPath({ basePath: '', category: 'infra', search: 'search' })).toBe(
        '/app/experimental-onboarding?category=infra&search=search'
      );
    });
  });
  describe('addPathParamToUrl', () => {
    it('adds the onboarding link to url with existing params', () => {
      expect(
        addPathParamToUrl(
          '/app/integrations?query-1',
          '/app/experimental-onboarding?search=aws&category=infra'
        )
      ).toBe(
        '/app/integrations?query-1&observabilityOnboardingLink=%2Fapp%2Fexperimental-onboarding%3Fsearch%3Daws%26category%3Dinfra'
      );
    });
    it('adds the onboarding link to url without existing params', () => {
      expect(
        addPathParamToUrl(
          '/app/integrations',
          '/app/experimental-onboarding?search=aws&category=infra'
        )
      ).toBe(
        '/app/integrations?observabilityOnboardingLink=%2Fapp%2Fexperimental-onboarding%3Fsearch%3Daws%26category%3Dinfra'
      );
    });
  });
});
