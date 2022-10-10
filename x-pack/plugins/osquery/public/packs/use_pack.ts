/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import { useKibana } from '../common/lib/kibana';
import type { PackItem } from './types';

interface UsePack {
  packId?: string;
  skip?: boolean;
}

export const usePack = ({ packId, skip = false }: UsePack) => {
  const { http } = useKibana().services;

  return useQuery<{ data: PackItem }, unknown, PackItem>(
    ['pack', { packId }],
    () => http.get(`/api/osquery/packs/${packId}`),
    {
      select: (response) => response?.data,
      keepPreviousData: true,
      enabled: !!(!skip && packId),
    }
  );
};
