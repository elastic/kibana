/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { BehaviorSubject } from 'rxjs';

import { mockSearchService } from '../../../common/mocks/mock_kibana_search_service';

import { useIndicatorsTotalCount } from './use_indicators_total_count';
import { DEFAULT_THREAT_INDEX_KEY } from '../../../../common/constants';

jest.mock('../../../hooks/use_kibana');

const indicatorsResponse = { rawResponse: { hits: { hits: [], total: 0 } } };

describe('useIndicatorsTotalCount()', () => {
  let mockSearch: ReturnType<typeof mockSearchService>;

  describe('when mounted', () => {
    beforeEach(() => {
      mockSearch = mockSearchService(new BehaviorSubject(indicatorsResponse));
    });

    beforeEach(async () => {
      renderHook(() => useIndicatorsTotalCount());
    });

    it('should query the database for threat indicators', async () => {
      expect(mockSearch.search).toHaveBeenCalledTimes(1);
    });

    it('should retrieve index patterns from settings', () => {
      expect(mockSearch.getUiSetting).toHaveBeenCalledWith(DEFAULT_THREAT_INDEX_KEY);
    });
  });

  describe('when rerendered', () => {
    beforeEach(async () => {
      mockSearch = mockSearchService(new BehaviorSubject(indicatorsResponse));
    });

    it('should not call the database when rerendered', async () => {
      const { rerender } = renderHook(() => useIndicatorsTotalCount());

      rerender();

      expect(mockSearch.search).toHaveBeenCalledTimes(1);
    });
  });

  describe('when query succeeds', () => {
    beforeEach(async () => {
      mockSearch = mockSearchService(new BehaviorSubject(indicatorsResponse));
    });

    it('should return the total count', async () => {
      const { result } = renderHook(() => useIndicatorsTotalCount());

      expect(result.current.count).toEqual(indicatorsResponse.rawResponse.hits.total);
      expect(result.current.isLoading).toEqual(false);
    });
  });
});
