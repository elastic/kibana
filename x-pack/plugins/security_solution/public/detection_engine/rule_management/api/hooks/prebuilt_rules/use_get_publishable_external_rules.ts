/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { RuleResponse } from '../../../../../../common/api/detection_engine';

export const useGetPublishableExternalRules = (rules: RuleResponse[]): RuleResponse[] => {
  const publishableExternalRules = useMemo(() => {
    return rules.filter(
      (rule) =>
        rule.rule_source?.type === 'external' &&
        rule.rule_source.repository_id != null &&
        rule.rule_source.is_customized === true
    );
  }, [rules]);

  return publishableExternalRules;
};
