/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SolutionPageName } from './types';
import { getNavLinkIdFromSolutionPageName, getSolutionPageNameFromNavLinkId } from './util';

describe('util', () => {
  describe('getNavLinkIdFromSolutionPageName', () => {
    it('should return the correct navLink id for security pages', () => {
      expect(getNavLinkIdFromSolutionPageName('administration' as SolutionPageName)).toEqual(
        'securitySolutionUI:administration'
      );
    });

    it('should return the correct navLink id for app root', () => {
      expect(getNavLinkIdFromSolutionPageName('discover:' as SolutionPageName)).toEqual('discover');
    });

    it('should return the correct navLink id for app nested pages', () => {
      expect(getNavLinkIdFromSolutionPageName('ml:overview' as SolutionPageName)).toEqual(
        'ml:overview'
      );
    });

    it('should return the correct navLink id pages with custom path', () => {
      expect(
        getNavLinkIdFromSolutionPageName('integrations:/browse/security' as SolutionPageName)
      ).toEqual('integrations');
    });

    it('should return the correct navLink id for nested page custom path', () => {
      expect(
        getNavLinkIdFromSolutionPageName('fleet:agents/test/path' as SolutionPageName)
      ).toEqual('fleet:agents');
    });
  });

  describe('getSolutionPageNameFromNavLinkId', () => {
    it('should return the correct solution page name for security pages', () => {
      expect(getSolutionPageNameFromNavLinkId('securitySolutionUI:administration')).toEqual(
        'administration'
      );
    });

    it('should return the correct solution page name for app root', () => {
      expect(getSolutionPageNameFromNavLinkId('discover')).toEqual('discover:');
    });

    it('should return the correct solution page name for app nested pages', () => {
      expect(getSolutionPageNameFromNavLinkId('ml:overview')).toEqual('ml:overview');
    });
  });
});
