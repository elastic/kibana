/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RenderHookResult } from '@testing-library/react-hooks';
import { renderHook } from '@testing-library/react-hooks';
import { useWhichFlyout } from './use_which_flyout';
import { Flyouts } from '../../shared/constants/flyouts';

describe('useWhichFlyout', () => {
  let hookResult: RenderHookResult<{}, string>;

  beforeEach(() => {
    jest.clearAllMocks();
    window.location.search = '?';
  });

  it('should return SecuritySolution flyout if timelineFlyout is not in the url', () => {
    Object.defineProperty(window, 'location', {
      value: {
        search:
          '?flyout=(right:(id:document-details-right,params:(id:id,indexName:indexName,scopeId:sopeId)))',
      },
    });

    hookResult = renderHook(() => useWhichFlyout());

    expect(hookResult.result.current).toEqual(Flyouts.securitySolution);
  });

  it('should return SecuritySolution flyout if timelineFlyout is in the url but empty', () => {
    Object.defineProperty(window, 'location', {
      value: {
        search:
          '?flyout=(right:(id:document-details-right,params:(id:id,indexName:indexName,scopeId:sopeId)))&timelineFlyout=()',
      },
    });

    hookResult = renderHook(() => useWhichFlyout());

    expect(hookResult.result.current).toEqual(Flyouts.securitySolution);
  });

  it('should return Timeline flyout if timeline is not in the url', () => {
    Object.defineProperty(window, 'location', {
      value: {
        search:
          '?flyout=(right:(id:document-details-right,params:(id:id,indexName:indexName,scopeId:sopeId)))&timelineFlyout=(right:(id:document-details-right,params:(id:id,indexName:indexName,scopeId:scopeId)))',
      },
    });

    hookResult = renderHook(() => useWhichFlyout());

    expect(hookResult.result.current).toEqual(Flyouts.timeline);
  });
});
