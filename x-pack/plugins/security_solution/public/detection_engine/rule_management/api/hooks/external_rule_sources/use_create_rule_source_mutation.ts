/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { UseMutationOptions } from '@tanstack/react-query';
import { useMutation } from '@tanstack/react-query';
import type {
  CreateExternalRuleSourceRequestBody,
  CreateExternalRuleSourceResponse,
} from '../../../../../../common/api/detection_engine/external_rule_sources/create_external_rule_source/create_external_source.gen';
import { CREATE_EXTERNAL_RULE_SOURCE } from '../../../../../../common/api/detection_engine/external_rule_sources/urls';
import { createExternalRuleSource } from '../../api';
import { useInvalidateFetchExternalRuleSourcesQuery } from './use_fetch_external_rule_sources';

export const CREATE_RULE_SOURCE_MUTATION_KEY = ['POST', CREATE_EXTERNAL_RULE_SOURCE];

export const useCreateRuleSourceMutation = (
  options?: UseMutationOptions<
    CreateExternalRuleSourceResponse,
    Error,
    CreateExternalRuleSourceRequestBody
  >
) => {
  const invalidateFetchExternalRuleSourcesQuery = useInvalidateFetchExternalRuleSourcesQuery();

  return useMutation<CreateExternalRuleSourceResponse, Error, CreateExternalRuleSourceRequestBody>(
    (ruleSource: CreateExternalRuleSourceRequestBody) => createExternalRuleSource(ruleSource),
    {
      ...options,
      mutationKey: CREATE_RULE_SOURCE_MUTATION_KEY,
      onSettled: (...args) => {
        invalidateFetchExternalRuleSourcesQuery();

        if (options?.onSettled) {
          options.onSettled(...args);
        }
      },
    }
  );
};
