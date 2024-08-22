/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { pick } from 'lodash';
import type { RuleResponse } from '../../../../../../common/api/detection_engine';

export interface PublishableExternalRules {
  rule_id: string;
  repository_id: string;
  revision: number;
}

export const useGetPublishableExternalRules = (
  rules: RuleResponse[]
): PublishableExternalRules[] => {
  const publishableExternalRules = useMemo(() => {
    return rules
      .filter(
        (rule) =>
          rule.rule_source?.type === 'external' &&
          rule.rule_source.repository_id != null &&
          rule.rule_source.is_customized === true
      )
      .map((rule) =>
        pick(rule, ['rule_id', 'repository_id', 'revision'])
      ) as PublishableExternalRules[];
  }, [rules]);

  return publishableExternalRules;
};
