/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useAppContext } from '../contexts/app_context';

interface ReturnValue {
  hasIndices: boolean;
}

export const useIndices = () => {
  const { http } = useAppContext();
  return async (): Promise<ReturnValue> => {
    try {
      const response = await http.get<
        { ok: true; hasIndices: boolean } | { ok: false; err: { msg: string } }
      >('../api/searchprofiler/getIndices');

      return { hasIndices: response.ok ? response.hasIndices : false };
    } catch (e) {
      throw new Error('Error fetching indices:', e);
    }
  };
};
