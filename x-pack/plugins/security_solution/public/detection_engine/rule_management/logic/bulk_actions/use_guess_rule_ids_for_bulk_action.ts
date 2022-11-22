/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { BulkActionType } from '../../../../../common/detection_engine/rule_management/api/rules/bulk_actions/request_schema';
import { useRulesTableContextOptional } from '../../../rule_management_ui/components/rules_table/rules_table/rules_table_context';

export function useGuessRuleIdsForBulkAction(): (bulkActionType: BulkActionType) => string[] {
  const rulesTableContext = useRulesTableContextOptional();

  return useCallback(
    (bulkActionType: BulkActionType) => {
      const allRules = rulesTableContext?.state.isAllSelected ? rulesTableContext.state.rules : [];
      const processingRules =
        bulkActionType === BulkActionType.enable
          ? allRules.filter((x) => !x.enabled)
          : bulkActionType === BulkActionType.disable
          ? allRules.filter((x) => x.enabled)
          : allRules;

      return processingRules.map((r) => r.id);
    },
    [rulesTableContext]
  );
}
