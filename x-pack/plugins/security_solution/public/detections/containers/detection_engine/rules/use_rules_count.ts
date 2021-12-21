/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState } from 'react';
import type { GetRulesCountResponse } from '../../../../../common/detection_engine/schemas/response';

import { fetchRulesCount } from './api';

interface UseRuleCount {
  fetchRulesCount: (filter: string) => Promise<void>;
  rulesCount: GetRulesCountResponse | null;
}

export const useRulesCount = (): UseRuleCount => {
  const [rulesCount, setRulesCount] = useState<GetRulesCountResponse | null>(null);

  const fetchData = async (filter: string) => {
    try {
      const res = await fetchRulesCount({ filter });
      setRulesCount(res);
    } catch (err) {
      setRulesCount(null);
    }
  };

  return {
    fetchRulesCount: fetchData,
    rulesCount,
  };
};
