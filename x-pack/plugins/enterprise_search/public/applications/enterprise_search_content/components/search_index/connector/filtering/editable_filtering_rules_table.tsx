/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions, useValues } from 'kea';
import { v4 as uuidv4 } from 'uuid';

import {
  EuiCode,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiSelect,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import {
  FilteringPolicy,
  FilteringRule,
  FilteringRuleRule,
} from '../../../../../../../common/types/connectors';

import { InlineEditableTable } from '../../../../../shared/tables/inline_editable_table/inline_editable_table';
import {
  InlineEditableTableLogic,
  InlineEditableTableProps,
} from '../../../../../shared/tables/inline_editable_table/inline_editable_table_logic';
import {
  FormErrors,
  InlineEditableTableColumn,
} from '../../../../../shared/tables/inline_editable_table/types';
import { ItemWithAnID } from '../../../../../shared/tables/types';

import {
  filteringPolicyToText,
  filteringRuleToText,
} from '../../../../utils/filtering_rule_helpers';

import { IndexViewLogic } from '../../index_view_logic';

import { ConnectorFilteringLogic } from './connector_filtering_logic';

const instanceId = 'FilteringRulesTable';

function validateItem(filteringRule: FilteringRule): FormErrors {
  if (filteringRule.rule === FilteringRuleRule.REGEX) {
    try {
      new RegExp(filteringRule.value);
      return {};
    } catch {
      return {
        value: i18n.translate(
          'xpack.enterpriseSearch.content.index.connector.filteringRules.regExError',
          { defaultMessage: 'Value should be a regular expression' }
        ),
      };
    }
  }
  return {};
}

export const FilteringRulesTable: React.FC = () => {
  const { editableFilteringRules } = useValues(ConnectorFilteringLogic);
  const { indexName } = useValues(IndexViewLogic);
  const { addFilteringRule, deleteFilteringRule, reorderFilteringRules, updateFilteringRule } =
    useActions(ConnectorFilteringLogic);

  const description = (
    <EuiText size="s" color="default">
      {i18n.translate('xpack.enterpriseSearch.content.index.connector.filteringRules.description', {
        defaultMessage:
          'Add an indexing rule to customize what data is synchronized from {indexName}. Everything is included by default, and documents are validated against the configured set of indexing rules starting from the top listed down.',
        values: { indexName },
      })}
      <EuiSpacer />
      <EuiLink href={'TODOTODOTODO'} external>
        {i18n.translate('xpack.enterpriseSearch.content.index.connector.filteringRules.link', {
          defaultMessage: 'Learn more about customizing your index rules.',
        })}
      </EuiLink>
    </EuiText>
  );

  const columns: Array<InlineEditableTableColumn<FilteringRule>> = [
    {
      editingRender: (filteringRule, onChange) => (
        <EuiSelect
          fullWidth
          value={filteringRule.policy}
          onChange={(e) => onChange(e.target.value)}
          options={[
            {
              text: filteringPolicyToText(FilteringPolicy.INCLUDE),
              value: FilteringPolicy.INCLUDE,
            },
            {
              text: filteringPolicyToText(FilteringPolicy.EXCLUDE),
              value: FilteringPolicy.EXCLUDE,
            },
          ]}
        />
      ),
      field: 'policy',
      name: i18n.translate(
        'xpack.enterpriseSearch.index.connector.filtering.basicTable.policyTitle',
        { defaultMessage: 'Policy' }
      ),
      render: (indexingRule) => (
        <EuiText size="s">{filteringPolicyToText(indexingRule.policy)}</EuiText>
      ),
    },
    {
      editingRender: (filteringRule, onChange) => (
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem>
            <EuiFieldText
              fullWidth
              value={filteringRule.field}
              onChange={(e) => onChange(e.target.value)}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      ),
      field: 'field',
      name: i18n.translate(
        'xpack.enterpriseSearch.index.connector.filtering.basicTable.fieldTitle',
        { defaultMessage: 'Field' }
      ),
      render: (indexingRule) => (
        <EuiText size="s">
          <EuiCode>{indexingRule.field}</EuiCode>
        </EuiText>
      ),
    },
    {
      editingRender: (filteringRule, onChange) => (
        <EuiSelect
          fullWidth
          value={filteringRule.rule}
          onChange={(e) => onChange(e.target.value)}
          options={Object.values(FilteringRuleRule).map((rule) => ({
            text: filteringRuleToText(rule),
            value: rule,
          }))}
        />
      ),
      field: 'rule',
      name: i18n.translate(
        'xpack.enterpriseSearch.index.connector.filtering.basicTable.ruleTitle',
        { defaultMessage: 'Rule' }
      ),
      render: (filteringRule) => (
        <EuiText size="s">{filteringRuleToText(filteringRule.rule)}</EuiText>
      ),
    },
    {
      editingRender: (filteringRule, onChange) => (
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem>
            <EuiFieldText
              fullWidth
              value={filteringRule.value}
              onChange={(e) => onChange(e.target.value)}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      ),
      field: 'value',
      name: i18n.translate(
        'xpack.enterpriseSearch.index.connector.filtering.basicTable.valueTitle',
        {
          defaultMessage: 'Value',
        }
      ),
      render: (indexingRule) => (
        <EuiText size="s">
          <EuiCode>{indexingRule.value}</EuiCode>
        </EuiText>
      ),
    },
  ];

  return (
    <InlineEditableTable
      addButtonText={i18n.translate(
        'xpack.enterpriseSearch.content.index.connector.filtering.table.addRuleLabel',
        { defaultMessage: 'Add filter rule' }
      )}
      columns={columns}
      defaultItem={{
        policy: FilteringPolicy.INCLUDE,
        rule: FilteringRuleRule.EQUALS,
        value: '',
      }}
      description={description}
      instanceId={instanceId}
      items={editableFilteringRules}
      onAdd={(rule) => {
        const now = new Date().toISOString();

        const newRule = {
          ...rule,
          created_at: now,
          // crypto.randomUUID isn't widely enough available in browsers yet
          id: uuidv4(),
          updated_at: now,
        };
        addFilteringRule(newRule);
        InlineEditableTableLogic({
          instanceId,
        } as InlineEditableTableProps<ItemWithAnID>).actions.doneEditing();
      }}
      onDelete={deleteFilteringRule}
      onUpdate={updateFilteringRule}
      onReorder={reorderFilteringRules}
      title=""
      validateItem={validateItem}
      bottomRows={[
        <EuiText size="s">
          {i18n.translate(
            'xpack.enterpriseSearch.content.sources.filteringRulesTable.includeEverythingMessage',
            {
              defaultMessage: 'Include everything else from this source',
            }
          )}
        </EuiText>,
      ]}
      canRemoveLastItem
      emptyPropertyAllowed
      showRowIndex
    />
  );
};
