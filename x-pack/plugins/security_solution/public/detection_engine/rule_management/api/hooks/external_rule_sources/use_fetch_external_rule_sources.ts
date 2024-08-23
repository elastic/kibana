/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseQueryOptions } from '@tanstack/react-query';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import type {
  ReadExternalRuleSourceRequestBody,
  ReadExternalRuleSourceResponse,
} from '../../../../../../common/api/detection_engine/external_rule_sources/read_external_rule_sources/read_external_rule_source.gen';
import { READ_EXTERNAL_RULE_SOURCES } from '../../../../../../common/api/detection_engine/external_rule_sources/urls';
import { readExternalRuleSources } from '../../api';
import { DEFAULT_QUERY_OPTIONS } from '../constants';

const READ_EXTERNAL_RULE_SOURCES_KEY = ['POST', READ_EXTERNAL_RULE_SOURCES];

export const useFetchExternalRuleSourcesQuery = (
  request: ReadExternalRuleSourceRequestBody,
  options?: UseQueryOptions<ReadExternalRuleSourceResponse>
) => {
  return useQuery<ReadExternalRuleSourceResponse>(
    [...READ_EXTERNAL_RULE_SOURCES_KEY, request],
    async () => {
      const response = await readExternalRuleSources(request);

      return response;
    },
    {
      ...DEFAULT_QUERY_OPTIONS,
      ...options,
    }
  );
};

export const useInvalidateFetchExternalRuleSourcesQuery = () => {
  const queryClient = useQueryClient();

  return useCallback(() => {
    /**
     * Invalidate all queries that start with FIND_RULES_QUERY_KEY. This
     * includes the in-memory query cache and paged query cache.
     */
    queryClient.invalidateQueries(READ_EXTERNAL_RULE_SOURCES_KEY, {
      refetchType: 'active',
    });
  }, [queryClient]);
};
