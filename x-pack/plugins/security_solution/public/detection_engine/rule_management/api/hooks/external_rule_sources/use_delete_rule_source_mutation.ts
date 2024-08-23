/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { UseMutationOptions } from '@tanstack/react-query';
import { useMutation } from '@tanstack/react-query';
import { DELETE_EXTERNAL_RULE_SOURCE } from '../../../../../../common/api/detection_engine/external_rule_sources/urls';
import { deleteExternalRuleSource } from '../../api';
import { useInvalidateFetchExternalRuleSourcesQuery } from './use_fetch_external_rule_sources';
import type {
  DeleteExternalRuleSourceRequestBody,
  DeleteExternalRuleSourceResponse,
} from '../../../../../../common/api/detection_engine/external_rule_sources/delete_external_rule_source/delete_external_rule_source.gen';

export const DELETE_RULE_SOURCE_MUTATION_KEY = ['POST', DELETE_EXTERNAL_RULE_SOURCE];

export const useDeleteRuleSourceMutation = (
  options?: UseMutationOptions<
    DeleteExternalRuleSourceResponse,
    Error,
    DeleteExternalRuleSourceRequestBody
  >
) => {
  const invalidateFetchExternalRuleSourcesQuery = useInvalidateFetchExternalRuleSourcesQuery();

  return useMutation<DeleteExternalRuleSourceResponse, Error, DeleteExternalRuleSourceRequestBody>(
    (ruleSource: DeleteExternalRuleSourceRequestBody) => deleteExternalRuleSource(ruleSource),
    {
      ...options,
      mutationKey: DELETE_RULE_SOURCE_MUTATION_KEY,
      onSettled: (...args) => {
        invalidateFetchExternalRuleSourcesQuery();

        if (options?.onSettled) {
          options.onSettled(...args);
        }
      },
    }
  );
};
