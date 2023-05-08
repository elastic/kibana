/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback, useMemo, useState } from 'react';
import type { CriteriaWithPagination, EuiBasicTableColumn } from '@elastic/eui';
import * as myI18n from './translations';

import type { Rule } from '../../../rule_management/logic/types';
import { getRulesTableColumn } from './utils';
import { useFindRules } from '../../../rule_management/logic/use_find_rules';

export interface Props {
  onRuleSelectionChange: (rulesSelectedToAdd: Rule[]) => void;
}
export const useCopyRuleConfigurationsTable = ({ onRuleSelectionChange }: Props) => {
  const { data: { rules } = { rules: [], total: 0 }, isFetched } = useFindRules({
    filterOptions: {
      filter: '',
      showCustomRules: false,
      showElasticRules: false,
      tags: [],
    },
    sortingOptions: undefined,
    pagination: {
      page: 1,
      perPage: 10000,
    },
  });

  const [pagination, setPagination] = useState({
    pageIndex: 0,
    initialPageSize: 25,
    showPerPageOptions: false,
  });

  const searchOptions = useMemo(
    () => ({
      box: {
        incremental: true,
        schema: true,
      },
    }),
    []
  );

  const rulesTableColumns: Array<EuiBasicTableColumn<Rule>> = useMemo(
    () => getRulesTableColumn(),
    []
  );
  const onTableChange = useCallback(
    ({ page: { index } }: CriteriaWithPagination<never>) =>
      setPagination({ ...pagination, pageIndex: index }),
    [pagination]
  );
  return {
    isLoading: !isFetched,
    pagination,
    searchOptions,
    rules,
    rulesTableColumns,
    copyRuleConfigurationsDescription: myI18n.COPY_RULE_CONFIGURATIONS_DESCRIPTION,
    onTableChange,
  };
};
