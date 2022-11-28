/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { sortBy } from 'lodash';
import type {
  CriteriaWithPagination,
  EuiBasicTableColumn,
  HorizontalAlignment,
} from '@elastic/eui';
import { EuiLoadingContent } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useFindRulesInMemory } from '../../../../rule_management_ui/components/rules_table/rules_table/use_find_rules_in_memory';
import type { Rule } from '../../../../rule_management/logic/types';
import { getRulesTableColumn } from '../utils';
import { LinkRuleSwitch } from './link_rule_switch';

export interface ExceptionsAddToRulesComponentProps {
  initiallySelectedRules?: Rule[];
  onRuleSelectionChange?: (rulesSelectedToAdd: Rule[]) => void;
}
export const useAddToRulesTable = ({
  initiallySelectedRules,
  onRuleSelectionChange,
}: ExceptionsAddToRulesComponentProps) => {
  const { data: { rules } = { rules: [], total: 0 }, isFetched } = useFindRulesInMemory({
    isInMemorySorting: true,
    filterOptions: {
      filter: '',
      showCustomRules: false,
      showElasticRules: false,
      tags: [],
    },
    sortingOptions: undefined,
    pagination: undefined,
    refetchInterval: false,
  });

  const [pagination, setPagination] = useState({ pageIndex: 0 });
  const [message, setMessage] = useState<JSX.Element | string | undefined>(
    <EuiLoadingContent lines={4} data-test-subj="exceptionItemViewerEmptyPrompts-loading" />
  );

  useEffect(() => {
    if (!isFetched) {
      setMessage(
        <EuiLoadingContent lines={4} data-test-subj="exceptionItemViewerEmptyPrompts-loading" />
      );
    }

    if (isFetched) {
      setMessage(undefined);
    }
  }, [setMessage, isFetched]);

  const searchOptions = useMemo(
    () => ({
      box: {
        incremental: true,
      },
      filters: [
        {
          type: 'field_value_selection' as const,
          field: 'tags',
          name: i18n.translate(
            'xpack.securitySolution.exceptions.addToRulesTable.tagsFilterLabel',
            {
              defaultMessage: 'Tags',
            }
          ),
          multiSelect: 'or' as const,
          options: rules.flatMap(({ tags }) => {
            return tags.map((tag) => ({
              value: tag,
              name: tag,
            }));
          }),
        },
      ],
    }),
    [rules]
  );

  const sortedRulesByLinkedRulesOnTop = useMemo(
    () =>
      sortBy(rules, [
        (rule) => {
          return initiallySelectedRules?.find((initRule) => initRule.id === rule.id);
        },
      ]),
    [initiallySelectedRules, rules]
  );
  const rulesTableColumnsWithLinkSwitch: Array<EuiBasicTableColumn<Rule>> = [
    {
      field: 'link',
      name: 'Link',
      align: 'left' as HorizontalAlignment,
      'data-test-subj': 'ruleActionLinkRuleSwitch',
      render: (_, rule: Rule) => (
        <LinkRuleSwitch
          rule={rule}
          initiallySelectedRules={initiallySelectedRules}
          onRuleSelectionChange={onRuleSelectionChange}
        />
      ),
    },
    ...getRulesTableColumn(),
  ];
  const onTableChange = ({ page: { index } }: CriteriaWithPagination<never>) =>
    setPagination({ pageIndex: index });

  return {
    isFetched,
    message,
    pagination: {
      ...pagination,
      itemsPerPage: 5,
      showPerPageOptions: false,
    },
    searchOptions,
    sortedRulesByLinkedRulesOnTop,
    rulesTableColumnsWithLinkSwitch,
    onTableChange,
  };
};
