/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataViewFieldBase } from '@kbn/es-query';

import { useRuleIndices } from './use_rule_indices';
import { useFetchIndex } from '../../../common/containers/source';

interface UseRuleFieldParams {
  machineLearningJobId?: string[];
  indexPattern?: string[];
}

interface UseRuleFieldsReturn {
  loading: boolean;
  fields: DataViewFieldBase[];
}

export const useRuleFields = ({
  machineLearningJobId,
  indexPattern,
}: UseRuleFieldParams): UseRuleFieldsReturn => {
  const { ruleIndices } = useRuleIndices(machineLearningJobId, indexPattern);
  const [
    loading,
    {
      indexPatterns: { fields },
    },
  ] = useFetchIndex(ruleIndices);

  return { loading, fields };
};
