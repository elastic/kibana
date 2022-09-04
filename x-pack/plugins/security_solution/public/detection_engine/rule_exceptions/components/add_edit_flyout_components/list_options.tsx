/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiTitle,
  EuiSpacer,
  EuiPanel,
  EuiRadioGroup,
  EuiRadio,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInMemoryTable,
} from '@elastic/eui';
import styled, { css } from 'styled-components';
import { FormattedMessage } from '@kbn/i18n-react';

import type { Action } from './reducer';
import * as i18n from './translations';
import type { Rule } from '../../../../detections/containers/detection_engine/rules/types';
import { useFindRules } from '../../../../detections/pages/detection_engine/rules/all/rules_table/use_find_rules';
import { SecuritySolutionLinkAnchor } from '../../../../common/components/links';
import { SecurityPageName } from '../../../../../common/constants';
import { RuleDetailTabs } from '../../../../detections/pages/detection_engine/rules/details';
import { getRuleDetailsTabUrl } from '../../../../common/components/link_to/redirect_to_detection_engine';

export type AddToRuleListsRadioOptions = 'select_rules_to_add_to' | 'add_to_rules' | 'add_to_rule';

const rulesColumns = [
  {
    field: 'name',
    name: 'Name',
    sortable: true,
    'data-test-subj': 'ruleNameCell',
  },
  {
    name: 'Actions',
    actions: [
      {
        'data-test-subj': 'ruleAction-view',
        render: (rule) => {
          return (
            <SecuritySolutionLinkAnchor
              data-test-subj="ruleName"
              deepLinkId={SecurityPageName.rules}
              path={getRuleDetailsTabUrl(rule.id, RuleDetailTabs.alerts)}
              color="#0071C2"
              external
            >
              {i18n.VIEW_RULE_DETAIL_ACTION}
            </SecuritySolutionLinkAnchor>
          );
        },
      },
    ],
  },
];

interface ExceptionsAddToListsComponentProps {
  possibleRules: Rule[] | null;
  addToRulesOrListsSelection: string;
  isSingleRule: boolean;
  isBulkAction: boolean;
  dispatch: React.Dispatch<Action>;
}

const SectionHeader = styled(EuiTitle)`
  ${() => css`
    font-weight: ${({ theme }) => theme.eui.euiFontWeightSemiBold};
  `}
`;

const ExceptionsAddToListsComponent: React.FC<ExceptionsAddToListsComponentProps> = ({
  possibleRules,
  isSingleRule,
  isBulkAction,
  addToRulesOrListsSelection,
  dispatch,
}): JSX.Element => {
  const [pagination, setPagination] = useState({ pageIndex: 0 });

  // Fetch rules
  const { data: { rules, total } = { rules: [], total: 0 }, isFetched } = useFindRules({
    isInMemorySorting: true,
    filterOptions: undefined,
    sortingOptions: undefined,
    pagination: undefined,
    refetchInterval: false,
  });

  /**
   * Reducer action dispatchers
   * */
  const setRadioOption = useCallback(
    (option: AddToRuleListsRadioOptions): void => {
      dispatch({
        type: 'setListsRadioOption',
        option,
      });
    },
    [dispatch]
  );

  const setSelectedRules = useCallback(
    (rulesSelectedToAdd: Rule[]): void => {
      dispatch({
        type: 'setSelectedRulesToAddTo',
        rules: rulesSelectedToAdd,
      });
    },
    [dispatch]
  );

  const handleRadioChange = useCallback(
    (id: string) => {
      setRadioOption(id);
    },
    [setRadioOption]
  );

  const getSingleRuleAddToRuleRadioOption = useCallback(
    (rule: Rule) => ({
      id: 'add_to_rule',
      label: (
        <FormattedMessage
          defaultMessage="Add to this rule: {ruleName}"
          id="xpack.securitySolution.exceptions.common.addToRuleOptionLabel"
          values={{
            ruleName: <span style={{ fontWeight: 'bold' }}>{rule.name}</span>,
          }}
        />
      ),
    }),
    []
  );

  const selectRulsToAddToRadioOption = useMemo(
    () => ({
      id: 'select_rules_to_add_to',
      label: (
        <FormattedMessage
          defaultMessage="Add to rules"
          id="xpack.securitySolution.exceptions.common.selectRulesOptionLabel"
        />
      ),
    }),
    []
  );

  const getBulkActionRulesToAddToRadioOption = useCallback(
    (rulesToAddTo: Rule[]) => ({
      id: 'add_to_rules',
      label: (
        <FormattedMessage
          defaultMessage="Add to [{numRules}] selected rules: {ruleNames}"
          id="xpack.securitySolution.exceptions.common.addToRulesOptionLabel"
          values={{
            numRules: rulesToAddTo.length,
            ruleNames: (
              <span style={{ fontWeight: 'bold' }}>
                {rulesToAddTo.map(({ name }) => name).join(',')}
              </span>
            ),
          }}
        />
      ),
    }),
    []
  );

  const ruleRadioOption = useMemo(() => {
    if (isSingleRule && possibleRules != null) {
      return getSingleRuleAddToRuleRadioOption(possibleRules[0]);
    }

    if (isBulkAction && possibleRules != null) {
      return getBulkActionRulesToAddToRadioOption(possibleRules);
    }

    return selectRulsToAddToRadioOption;
  }, [
    getBulkActionRulesToAddToRadioOption,
    getSingleRuleAddToRuleRadioOption,
    isBulkAction,
    isSingleRule,
    possibleRules,
    selectRulsToAddToRadioOption,
  ]);

  const ruleSelectionValue = {
    onSelectionChange: (selection: Rule[]) => {
      setSelectedRules(selection);
    },
    initialSelected: [],
  };

  const ruleSchema = {
    fields: {
      name: {
        type: 'string',
      },
      tags: {
        type: 'string',
      },
    },
  };

  const ruleSearch = {
    box: {
      incremental: false,
      schema: ruleSchema,
    },
    filters: [
      {
        type: 'field_value_selection',
        field: 'tags',
        name: 'Tags',
        multiSelect: 'or',
        options: rules.flatMap(({ tags }) => {
          return tags.map((tag) => ({
            value: tag,
            name: tag,
          }));
        }),
      },
    ],
  };

  return (
    <EuiPanel paddingSize="none" hasShadow={false}>
      <SectionHeader size="xs">
        <h3>{i18n.ADD_TO_LISTS_SECTION_TITLE}</h3>
      </SectionHeader>
      <EuiSpacer size="s" />
      <EuiRadio
        id={ruleRadioOption.id}
        label={ruleRadioOption.label}
        checked={addToRulesOrListsSelection === ruleRadioOption.id}
        onChange={handleRadioChange}
      />
      {addToRulesOrListsSelection === 'select_rules_to_add_to' && (
        <>
          <EuiSpacer size="s" />
          <EuiPanel color="subdued" borderRadius="none" hasShadow={false}>
            <>
              <EuiText size="s">{i18n.ADD_TO_SELECTED_RULES_DESCRIPTION}</EuiText>
              <EuiSpacer size="s" />
              <EuiInMemoryTable<Rule>
                tableCaption="List of exception lists"
                itemId="id"
                items={rules}
                loading={!isFetched}
                columns={rulesColumns}
                pagination={{
                  ...pagination,
                  itemsPerPage: 5,
                  showPerPageOptions: false,
                }}
                onTableChange={({ page: { index } }) => setPagination({ pageIndex: index })}
                sorting={true}
                selection={ruleSelectionValue}
                isSelectable={true}
                search={ruleSearch}
              />
            </>
          </EuiPanel>
        </>
      )}
    </EuiPanel>
  );
};

export const ExceptionsAddToLists = React.memo(ExceptionsAddToListsComponent);

ExceptionsAddToLists.displayName = 'ExceptionsAddToLists';
