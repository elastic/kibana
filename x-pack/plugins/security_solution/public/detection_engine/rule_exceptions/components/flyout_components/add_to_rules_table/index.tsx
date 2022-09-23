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
import type { Rule } from '../../../../../detections/containers/detection_engine/rules/types';
import { useFindRules } from '../../../../../detections/pages/detection_engine/rules/all/rules_table/use_find_rules';
import { getRulesSchema, getAddToRulesTableColumns } from './utils';

interface ExceptionsAddToRulesComponentProps {
  filter?: string;
  isEdit: boolean;
  initiallySelectedRules?: Rule[];
  onRuleSelectionChange?: (rulesSelectedToAdd: Rule[]) => void;
}

const ExceptionsAddToRulesTableComponent: React.FC<ExceptionsAddToRulesComponentProps> = ({
  isEdit,
  initiallySelectedRules,
  filter,
  onRuleSelectionChange,
}): JSX.Element => {
  const { data: { rules } = { rules: [], total: 0 }, isFetched } = useFindRules({
    isInMemorySorting: true,
    filterOptions: {
      filter: filter ?? '',
      showCustomRules: false,
      showElasticRules: false,
      tags: [],
    },
    sortingOptions: undefined,
    pagination: undefined,
    refetchInterval: false,
  });

  const [rulesToDisplay, setRulesToDisplay] = useState<Rule[]>([]);
  const [pagination, setPagination] = useState({ pageIndex: 0 });
  const [message, setMessage] = useState<JSX.Element | string | undefined>(
    <EuiLoadingContent lines={4} data-test-subj="exceptionItemViewerEmptyPrompts-loading" />
  );

  useEffect(() => {
    if (!isFetched) {
      setMessage(
        <EuiLoadingContent lines={4} data-test-subj="exceptionItemViewerEmptyPrompts-loading" />
      );
      setRulesToDisplay([]);
    } else {
      setMessage(undefined);
      setRulesToDisplay(rules);
    }
  }, [setMessage, isFetched, rules]);

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
        incremental: false,
        schema: getRulesSchema(),
      },
      filters: [
        {
          type: 'field_value_selection',
          field: 'tags',
          name: i18n.translate(
            'xpack.securitySolution.exceptions.addToRulesTable.tagsFilterLabel',
            {
              defaultMessage: 'Tags',
            }
          ),
          multiSelect: true,
          options: rulesToDisplay.flatMap(({ tags }) => {
            return tags.map((tag) => ({
              value: tag,
              name: tag,
            }));
          }),
        },
      ],
    }),
    [rulesToDisplay]
  );

  return (
    <EuiPanel color="subdued" borderRadius="none" hasShadow={false}>
      <>
        {!isEdit && <EuiText size="s">{myI18n.ADD_TO_SELECTED_RULES_DESCRIPTION}</EuiText>}
        <EuiSpacer size="s" />
        <EuiInMemoryTable<Rule>
          tableCaption="Rules table"
          itemId="id"
          items={rulesToDisplay}
          loading={!isFetched}
          columns={getAddToRulesTableColumns()}
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
          search={isEdit ? undefined : searchOptions}
          sorting
          isSelectable={!isEdit}
          data-test-subj="addExceptionToRulesTable"
        />
      </>
    </EuiPanel>
  );
};

export const ExceptionsAddToRulesTable = React.memo(ExceptionsAddToRulesTableComponent);

ExceptionsAddToRulesTable.displayName = 'ExceptionsAddToRulesTable';
