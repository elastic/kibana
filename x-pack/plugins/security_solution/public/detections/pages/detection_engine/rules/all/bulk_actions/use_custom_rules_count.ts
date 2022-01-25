/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useCallback } from 'react';
import { fetchRules } from '../../../../../containers/detection_engine/rules/api';
import type { FilterOptions } from '../../../../../containers/detection_engine/rules/types';

interface UseCustomRulesCount {
  fetchCustomRulesCount: (filterOptions: FilterOptions) => Promise<{ customRulesCount: number }>;
  customRulesCount: number;
  isCustomRulesCountLoading: boolean;
}

export const useCustomRulesCount = (): UseCustomRulesCount => {
  const [customRulesCount, setCustomRulesCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const fetchCustomRulesCount = useCallback(async (filterOptions: FilterOptions) => {
    const abortController = new AbortController();
    try {
      setIsLoading(true);
      const res = await fetchRules({
        pagination: { perPage: 1, page: 1, total: 0 },
        filterOptions: { ...filterOptions, showCustomRules: true },
        signal: abortController.signal,
      });
      setCustomRulesCount(res.total);
      return { customRulesCount: res.total };
    } catch (err) {
      setCustomRulesCount(0);
      return { customRulesCount: 0 };
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    fetchCustomRulesCount,
    customRulesCount,
    isCustomRulesCountLoading: isLoading,
  };
};
