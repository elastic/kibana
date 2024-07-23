/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RenderHookResult } from '@testing-library/react-hooks';
import { renderHook } from '@testing-library/react-hooks';
import { useWhichFlyout } from './use_which_flyout';
import { Flyouts } from '../constants/flyouts';

describe('useWhichFlyout', () => {
  let hookResult: RenderHookResult<{}, string | null>;

  beforeEach(() => {
    jest.clearAllMocks();
    window.location.search = '?';
  });

  describe('no flyout open', () => {
    it('should return null if only none are the url', () => {
      Object.defineProperty(window, 'location', {
        value: {
          search: '',
        },
      });

      hookResult = renderHook(() => useWhichFlyout());

      expect(hookResult.result.current).toEqual(null);
    });

    it('should return null if only they are the url but empty', () => {
      Object.defineProperty(window, 'location', {
        value: {
          search: '?flyout=()&timelineFlyout=()',
        },
      });

      hookResult = renderHook(() => useWhichFlyout());

      expect(hookResult.result.current).toEqual(null);
    });

    it('should return null if only they are the url but params are empty preview', () => {
      Object.defineProperty(window, 'location', {
        value: {
          search: '?flyout=(preview:!())&timelineFlyout=(preview:!())',
        },
      });

      hookResult = renderHook(() => useWhichFlyout());

      expect(hookResult.result.current).toEqual(null);
    });
  });

  describe('SecuritySolution flyout open', () => {
    it('should return SecuritySolution flyout if timelineFlyout is not in the url', () => {
      Object.defineProperty(window, 'location', {
        value: {
          search:
            '?flyout=(right:(id:document-details-right,params:(id:id,indexName:indexName,scopeId:scopeId)))',
        },
      });

      hookResult = renderHook(() => useWhichFlyout());

      expect(hookResult.result.current).toEqual(Flyouts.securitySolution);
    });

    it('should return SecuritySolution flyout if timelineFlyout is in the url but empty', () => {
      Object.defineProperty(window, 'location', {
        value: {
          search:
            '?flyout=(right:(id:document-details-right,params:(id:id,indexName:indexName,scopeId:scopeId)))&timelineFlyout=()',
        },
      });

      hookResult = renderHook(() => useWhichFlyout());

      expect(hookResult.result.current).toEqual(Flyouts.securitySolution);
    });

    it('should return SecuritySolution flyout if timelineFlyout is in the url but params are empty preview', () => {
      window.location.search =
        'http://app/security/alerts&flyout=(right:(id:document-details-right))&timelineFlyout=(preview:!())';

      hookResult = renderHook(() => useWhichFlyout());

      expect(hookResult.result.current).toEqual(Flyouts.securitySolution);
    });
  });

  describe('Timeline flyout open', () => {
    it('should return Timeline flyout if flyout and timelineFlyout are in the url', () => {
      Object.defineProperty(window, 'location', {
        value: {
          search:
            '?flyout=(right:(id:document-details-right,params:(id:id,indexName:indexName,scopeId:scopeId)))&timelineFlyout=(right:(id:document-details-right,params:(id:id,indexName:indexName,scopeId:scopeId)))',
        },
      });

      hookResult = renderHook(() => useWhichFlyout());

      expect(hookResult.result.current).toEqual(Flyouts.timeline);
    });

    it('should return Timeline flyout if only timelineFlyout is in the url', () => {
      Object.defineProperty(window, 'location', {
        value: {
          search:
            '?timelineFlyout=(right:(id:document-details-right,params:(id:id,indexName:indexName,scopeId:scopeId)))',
        },
      });

      hookResult = renderHook(() => useWhichFlyout());

      expect(hookResult.result.current).toEqual(Flyouts.timeline);
    });
  });
});
