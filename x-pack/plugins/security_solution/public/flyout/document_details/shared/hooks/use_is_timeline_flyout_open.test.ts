/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { useIsTimelineFlyoutOpen } from './use_is_timeline_flyout_open';

describe('useInvestigationGuide', () => {
  beforeAll(() => {
    Object.defineProperty(window, 'location', {
      value: {
        search: '?',
      },
    });
  });

  it('should return false when timeline flyout is not in url', () => {
    window.location.search = 'http://app/security/alerts';
    const hookResult = renderHook(() => useIsTimelineFlyoutOpen());
    expect(hookResult.result.current).toEqual(false);
  });

  it('should return false when timeline flyout is in url but params are empty', () => {
    window.location.search =
      'http://app/security/alerts&flyout=(right:(id:document-details-right))&timelineFlyout=()';
    const hookResult = renderHook(() => useIsTimelineFlyoutOpen());
    expect(hookResult.result.current).toEqual(false);
  });

  it('should return true when timeline flyout is open', () => {
    window.location.search =
      'http://app/security/alerts&flyout=(right:(id:document-details-right))&timelineFlyout=(right:(id:document-details-right,params:(id:id,indexName:index,scopeId:scope)))';
    const hookResult = renderHook(() => useIsTimelineFlyoutOpen());
    expect(hookResult.result.current).toEqual(true);
  });
});
