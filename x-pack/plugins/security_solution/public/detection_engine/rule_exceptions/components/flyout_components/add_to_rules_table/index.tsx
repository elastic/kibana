/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import type { CriteriaWithPagination } from '@elastic/eui';
import { EuiSpacer, EuiPanel, EuiText, EuiInMemoryTable, EuiLoadingContent } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import * as myI18n from './translations';
import type { Rule } from '../../../../rule_management/logic/types';
import { useFindRules } from '../../../../rule_management_ui/components/rules_table/rules_table/use_find_rules';
import { getRulesTableColumn } from '../utils';

interface ExceptionsAddToRulesComponentProps {
  initiallySelectedRules?: Rule[];
  onRuleSelectionChange?: (rulesSelectedToAdd: Rule[]) => void;
}

const ExceptionsAddToRulesTableComponent: React.FC<ExceptionsAddToRulesComponentProps> = ({
  initiallySelectedRules,
  onRuleSelectionChange,
}) => {
  const { data: { rules } = { rules: [], total: 0 }, isFetched } = useFindRules({
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

  const ruleSelectionValue = {
    onSelectionChange: (selection: Rule[]) => {
      if (onRuleSelectionChange != null) {
        onRuleSelectionChange(selection);
      }
    },
    initialSelected: initiallySelectedRules ?? [],
  };

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

  return (
    <EuiPanel color="subdued" borderRadius="none" hasShadow={false}>
      <>
        <EuiText size="s">{myI18n.ADD_TO_SELECTED_RULES_DESCRIPTION}</EuiText>
        <EuiSpacer size="s" />
        <EuiInMemoryTable<Rule>
          tableCaption="Rules table"
          itemId="id"
          items={rules}
          loading={!isFetched}
          columns={getRulesTableColumn()}
          pagination={{
            ...pagination,
            itemsPerPage: 5,
            showPerPageOptions: false,
          }}
          message={message}
          onTableChange={({ page: { index } }: CriteriaWithPagination<never>) =>
            setPagination({ pageIndex: index })
          }
          selection={ruleSelectionValue}
          search={searchOptions}
          sorting
          isSelectable
          data-test-subj="addExceptionToRulesTable"
        />
      </>
    </EuiPanel>
  );
};

export const ExceptionsAddToRulesTable = React.memo(ExceptionsAddToRulesTableComponent);

ExceptionsAddToRulesTable.displayName = 'ExceptionsAddToRulesTable';
