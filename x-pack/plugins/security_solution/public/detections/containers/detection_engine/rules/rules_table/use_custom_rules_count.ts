/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState } from 'react';
import type { FilterOptions } from '../types';

import { fetchRules } from '../api';

interface UseCustomRulesCount {
  fetchCustomRulesCount: (filterOptions: FilterOptions) => Promise<{ customRulesCount: number }>;
  customRulesCount: number;
}

export const useCustomRulesCount = (): UseCustomRulesCount => {
  const [customRulesCount, setCustomRulesCount] = useState<number>(0);

  const fetchCustomRulesCount = async (filterOptions: FilterOptions) => {
    const abortController = new AbortController();
    try {
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
    }
  };

  return {
    fetchCustomRulesCount,
    customRulesCount,
  };
};
