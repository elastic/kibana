/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from 'react-query';

import { useKibana } from '../common/lib/kibana';
import { GetOnePackagePolicyResponse } from '../../../fleet/common';
import { OsqueryManagerPackagePolicy } from '../../common/types';

interface UsePack {
  packId: string;
  skip?: boolean;
}

export const usePack = ({ packId, skip = false }: UsePack) => {
  const { http } = useKibana().services;

  return useQuery<
    Omit<GetOnePackagePolicyResponse, 'item'> & { item: OsqueryManagerPackagePolicy },
    unknown,
    OsqueryManagerPackagePolicy
  >(['pack', { packId }], () => http.get(`/internal/osquery/packs/${packId}`), {
    keepPreviousData: true,
    enabled: !skip || !packId,
  });
};
