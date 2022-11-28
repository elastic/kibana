/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState, memo } from 'react';

import type {
  CriteriaWithPagination,
  EuiBasicTableColumn,
  HorizontalAlignment,
} from '@elastic/eui';
import {
  EuiFlexItem,
  EuiSwitch,
  EuiSpacer,
  EuiPanel,
  EuiText,
  EuiInMemoryTable,
  EuiLoadingContent,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { sortBy } from 'lodash';
import * as myI18n from './translations';
import type { Rule } from '../../../../rule_management/logic/types';
import { useFindRulesInMemory } from '../../../../rule_management_ui/components/rules_table/rules_table/use_find_rules_in_memory';
import { getRulesTableColumn } from '../utils';

interface ExceptionsAddToRulesComponentProps {
  initiallySelectedRules?: Rule[];
  onRuleSelectionChange?: (rulesSelectedToAdd: Rule[]) => void;
}

const ExceptionsAddToRulesTableComponent: React.FC<ExceptionsAddToRulesComponentProps> = ({
  initiallySelectedRules,
  onRuleSelectionChange,
}) => {
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
  const [linkedRules, setLinkedRules] = useState<Rule[]>(initiallySelectedRules || []);

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

  const sortedRulesByLinkedRulesOnTop = useMemo(
    () =>
      sortBy(rules, [
        (rule) => {
          return initiallySelectedRules?.find((initRule) => initRule.id === rule.id);
        },
      ]),
    [initiallySelectedRules, rules]
  );

  const tagOptions = useMemo(() => {
    const uniqueTags = sortedRulesByLinkedRulesOnTop.reduce((acc: Set<string>, item: Rule) => {
      const { tags } = item;

      tags.forEach((tag) => acc.add(tag));
      return acc;
    }, new Set());
    return [...uniqueTags].map((tag) => ({ value: tag, name: tag }));
  }, [sortedRulesByLinkedRulesOnTop]);

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
          options: tagOptions,
        },
      ],
    }),
    [tagOptions]
  );

  // eslint-disable-next-line react/display-name
  const LinkRuleSwitch = memo(({ rule }: { rule: Rule }) => {
    const isRuleLinked = Boolean(linkedRules.find((r) => r.id === rule.id));

    return (
      <EuiFlexItem grow={false}>
        <EuiSwitch
          onChange={({ target: { checked } }) => {
            const newLinkedRules = !checked
              ? linkedRules?.filter((item) => item.id !== rule.id)
              : [...linkedRules, rule];
            setLinkedRules(newLinkedRules);
            if (typeof onRuleSelectionChange === 'function') onRuleSelectionChange(newLinkedRules);
          }}
          label=""
          checked={isRuleLinked}
        />
      </EuiFlexItem>
    );
  });
  const rulesTableColumnsWithLinkSwitch: Array<EuiBasicTableColumn<Rule>> = useMemo(
    () => [
      {
        field: 'link',
        name: myI18n.LINK_COLUMN,
        align: 'left' as HorizontalAlignment,
        'data-test-subj': 'ruleActionLinkRuleSwitch',
        render: (_, rule: Rule) => <LinkRuleSwitch rule={rule} />,
      },
      ...getRulesTableColumn(),
    ],
    [LinkRuleSwitch]
  );

  return (
    <EuiPanel color="subdued" borderRadius="none" hasShadow={false}>
      <>
        <EuiText size="s">{myI18n.ADD_TO_SELECTED_RULES_DESCRIPTION}</EuiText>
        <EuiSpacer size="s" />
        <EuiInMemoryTable<Rule>
          tableLayout="auto"
          search={searchOptions}
          data-test-subj="addExceptionToRulesTable"
          hasActions={true}
          tableCaption="Rules table"
          items={sortedRulesByLinkedRulesOnTop}
          loading={!isFetched}
          columns={rulesTableColumnsWithLinkSwitch}
          message={message}
          pagination={{
            ...pagination,
            initialPageSize: 5,
            showPerPageOptions: false,
          }}
          onTableChange={({ page: { index } }: CriteriaWithPagination<never>) =>
            setPagination({ pageIndex: index })
          }
        />
      </>
    </EuiPanel>
  );
};

export const ExceptionsAddToRulesTable = React.memo(ExceptionsAddToRulesTableComponent);

ExceptionsAddToRulesTable.displayName = 'ExceptionsAddToRulesTable';
