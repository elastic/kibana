/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';

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

  const LinkRuleSwitch = ({ rule }: { rule: Rule }) => {
    // TODO check how to refactor

    const isRuleLinked = linkedRules.find((r) => r.id === rule.id);
    const [linked, setLinked] = useState(!!isRuleLinked);

    return (
      <EuiFlexItem grow={false}>
        <EuiSwitch
          onChange={({ target: { checked } }) => {
            setLinked(checked);

            const newLinkedRules = !checked
              ? linkedRules?.filter((item) => item.id !== rule.id)
              : [...linkedRules, rule];
            setLinkedRules(newLinkedRules);
            if (typeof onRuleSelectionChange === 'function') onRuleSelectionChange(newLinkedRules);
          }}
          label=""
          checked={linked}
        />
      </EuiFlexItem>
    );
  };
  const rulesTableColumnsWithLinkSwitch: Array<EuiBasicTableColumn<Rule>> = [
    {
      field: 'link',
      name: 'Link',
      align: 'left' as HorizontalAlignment,
      'data-test-subj': 'ruleActionLinkRuleSwitch',
      render: (_, rule: Rule) => <LinkRuleSwitch rule={rule} />,
    },
    ...getRulesTableColumn(),
  ];

  return (
    <EuiPanel color="subdued" borderRadius="none" hasShadow={false}>
      <>
        <EuiText size="s">{myI18n.ADD_TO_SELECTED_RULES_DESCRIPTION}</EuiText>
        <EuiSpacer size="s" />
        <EuiInMemoryTable<Rule>
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
            itemsPerPage: 5,
            showPerPageOptions: false,
          }}
          onTableChange={({ page: { index } }: CriteriaWithPagination<never>) =>
            setPagination({ pageIndex: index })
          }
          cellProps={{}}
          rowProps={{}}
          tableLayout="auto"
        />
      </>
    </EuiPanel>
  );
};

export const ExceptionsAddToRulesTable = React.memo(ExceptionsAddToRulesTableComponent);

ExceptionsAddToRulesTable.displayName = 'ExceptionsAddToRulesTable';
