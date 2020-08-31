/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable react/display-name */

import {
  EuiBadge,
  EuiBasicTableColumn,
  EuiTableActionsColumnType,
  EuiText,
  EuiHealth,
  EuiToolTip,
} from '@elastic/eui';
import { FormattedRelative } from '@kbn/i18n/react';
import * as H from 'history';
import React, { Dispatch } from 'react';

import { isMlRule } from '../../../../../../common/machine_learning/helpers';
import { Rule, RuleStatus } from '../../../../containers/detection_engine/rules';
import { getEmptyTagValue } from '../../../../../common/components/empty_value';
import { FormattedDate } from '../../../../../common/components/formatted_date';
import { getRuleDetailsUrl } from '../../../../../common/components/link_to/redirect_to_detection_engine';
import { ActionToaster } from '../../../../../common/components/toasters';
import { TruncatableText } from '../../../../../common/components/truncatable_text';
import { getStatusColor } from '../../../../components/rules/rule_status/helpers';
import { RuleSwitch } from '../../../../components/rules/rule_switch';
import { SeverityBadge } from '../../../../components/rules/severity_badge';
import * as i18n from '../translations';
import {
  deleteRulesAction,
  duplicateRulesAction,
  editRuleAction,
  exportRulesAction,
} from './actions';
import { Action } from './reducer';
import { LocalizedDateTooltip } from '../../../../../common/components/localized_date_tooltip';
import * as detectionI18n from '../../translations';
import { LinkAnchor } from '../../../../../common/components/links';

export const getActions = (
  dispatch: React.Dispatch<Action>,
  dispatchToaster: Dispatch<ActionToaster>,
  history: H.History,
  reFetchRules: (refreshPrePackagedRule?: boolean) => void
) => [
  {
    description: i18n.EDIT_RULE_SETTINGS,
    icon: 'controlsHorizontal',
    name: i18n.EDIT_RULE_SETTINGS,
    onClick: (rowItem: Rule) => editRuleAction(rowItem, history),
  },
  {
    description: i18n.DUPLICATE_RULE,
    icon: 'copy',
    name: i18n.DUPLICATE_RULE,
    onClick: async (rowItem: Rule) => {
      await duplicateRulesAction([rowItem], [rowItem.id], dispatch, dispatchToaster);
      await reFetchRules(true);
    },
  },
  {
    'data-test-subj': 'exportRuleAction',
    description: i18n.EXPORT_RULE,
    icon: 'exportAction',
    name: i18n.EXPORT_RULE,
    onClick: (rowItem: Rule) => exportRulesAction([rowItem.rule_id], dispatch),
    enabled: (rowItem: Rule) => !rowItem.immutable,
  },
  {
    'data-test-subj': 'deleteRuleAction',
    description: i18n.DELETE_RULE,
    icon: 'trash',
    name: i18n.DELETE_RULE,
    onClick: async (rowItem: Rule) => {
      await deleteRulesAction([rowItem.id], dispatch, dispatchToaster);
      await reFetchRules(true);
    },
  },
];

export type RuleStatusRowItemType = RuleStatus & {
  name: string;
  id: string;
};
export type RulesColumns = EuiBasicTableColumn<Rule> | EuiTableActionsColumnType<Rule>;
export type RulesStatusesColumns = EuiBasicTableColumn<RuleStatusRowItemType>;
type FormatUrl = (path: string) => string;
interface GetColumns {
  dispatch: React.Dispatch<Action>;
  dispatchToaster: Dispatch<ActionToaster>;
  formatUrl: FormatUrl;
  history: H.History;
  hasMlPermissions: boolean;
  hasNoPermissions: boolean;
  loadingRuleIds: string[];
  reFetchRules: (refreshPrePackagedRule?: boolean) => void;
}

// Michael: Are we able to do custom, in-table-header filters, as shown in my wireframes?
export const getColumns = ({
  dispatch,
  dispatchToaster,
  formatUrl,
  history,
  hasMlPermissions,
  hasNoPermissions,
  loadingRuleIds,
  reFetchRules,
}: GetColumns): RulesColumns[] => {
  const cols: RulesColumns[] = [
    {
      field: 'name',
      name: i18n.COLUMN_RULE,
      render: (value: Rule['name'], item: Rule) => (
        <LinkAnchor
          data-test-subj="ruleName"
          onClick={(ev: { preventDefault: () => void }) => {
            ev.preventDefault();
            history.push(getRuleDetailsUrl(item.id));
          }}
          href={formatUrl(getRuleDetailsUrl(item.id))}
        >
          {value}
        </LinkAnchor>
      ),
      truncateText: true,
      width: '24%',
    },
    {
      field: 'risk_score',
      name: i18n.COLUMN_RISK_SCORE,
      render: (value: Rule['risk_score']) => (
        <EuiText data-test-subj="riskScore" size="s">
          {value}
        </EuiText>
      ),
      truncateText: true,
      width: '14%',
    },
    {
      field: 'severity',
      name: i18n.COLUMN_SEVERITY,
      render: (value: Rule['severity']) => <SeverityBadge value={value} />,
      truncateText: true,
      width: '16%',
    },
    {
      field: 'status_date',
      name: i18n.COLUMN_LAST_COMPLETE_RUN,
      render: (value: Rule['status_date']) => {
        return value == null ? (
          getEmptyTagValue()
        ) : (
          <LocalizedDateTooltip fieldName={i18n.COLUMN_LAST_COMPLETE_RUN} date={new Date(value)}>
            <FormattedRelative value={value} />
          </LocalizedDateTooltip>
        );
      },
      truncateText: true,
      width: '20%',
    },
    {
      field: 'status',
      name: i18n.COLUMN_LAST_RESPONSE,
      render: (value: Rule['status']) => {
        return (
          <>
            <EuiHealth color={getStatusColor(value ?? null)}>
              {value ?? getEmptyTagValue()}
            </EuiHealth>
          </>
        );
      },
      width: '16%',
      truncateText: true,
    },
    {
      field: 'tags',
      name: i18n.COLUMN_TAGS,
      render: (value: Rule['tags']) => (
        <TruncatableText data-test-subj="tags">
          {value.map((tag, i) => (
            <EuiBadge color="hollow" key={`${tag}-${i}`}>
              {tag}
            </EuiBadge>
          ))}
        </TruncatableText>
      ),
      truncateText: true,
      width: '20%',
    },
    {
      align: 'center',
      field: 'enabled',
      name: i18n.COLUMN_ACTIVATE,
      render: (value: Rule['enabled'], item: Rule) => (
        <EuiToolTip
          position="top"
          content={
            isMlRule(item.type) && !hasMlPermissions
              ? detectionI18n.ML_RULES_DISABLED_MESSAGE
              : undefined
          }
        >
          <RuleSwitch
            data-test-subj="enabled"
            dispatch={dispatch}
            id={item.id}
            enabled={item.enabled}
            isDisabled={
              hasNoPermissions || (isMlRule(item.type) && !hasMlPermissions && !item.enabled)
            }
            isLoading={loadingRuleIds.includes(item.id)}
          />
        </EuiToolTip>
      ),
      sortable: true,
      width: '95px',
    },
  ];
  const actions: RulesColumns[] = [
    {
      actions: getActions(dispatch, dispatchToaster, history, reFetchRules),
      width: '40px',
    } as EuiTableActionsColumnType<Rule>,
  ];

  return hasNoPermissions ? cols : [...cols, ...actions];
};

export const getMonitoringColumns = (
  history: H.History,
  formatUrl: FormatUrl
): RulesStatusesColumns[] => {
  const cols: RulesStatusesColumns[] = [
    {
      field: 'name',
      name: i18n.COLUMN_RULE,
      render: (value: RuleStatus['current_status']['status'], item: RuleStatusRowItemType) => {
        return (
          <LinkAnchor
            data-test-subj="ruleName"
            onClick={(ev: { preventDefault: () => void }) => {
              ev.preventDefault();
              history.push(getRuleDetailsUrl(item.id));
            }}
            href={formatUrl(getRuleDetailsUrl(item.id))}
          >
            {value}
          </LinkAnchor>
        );
      },
      truncateText: true,
      width: '24%',
    },
    {
      field: 'current_status.bulk_create_time_durations',
      name: i18n.COLUMN_INDEXING_TIMES,
      render: (value: RuleStatus['current_status']['bulk_create_time_durations']) => (
        <EuiText data-test-subj="bulk_create_time_durations" size="s">
          {value != null && value.length > 0
            ? Math.max(...value?.map((item) => Number.parseFloat(item)))
            : getEmptyTagValue()}
        </EuiText>
      ),
      truncateText: true,
      width: '14%',
    },
    {
      field: 'current_status.search_after_time_durations',
      name: i18n.COLUMN_QUERY_TIMES,
      render: (value: RuleStatus['current_status']['search_after_time_durations']) => (
        <EuiText data-test-subj="search_after_time_durations" size="s">
          {value != null && value.length > 0
            ? Math.max(...value?.map((item) => Number.parseFloat(item)))
            : getEmptyTagValue()}
        </EuiText>
      ),
      truncateText: true,
      width: '14%',
    },
    {
      field: 'current_status.gap',
      name: i18n.COLUMN_GAP,
      render: (value: RuleStatus['current_status']['gap']) => (
        <EuiText data-test-subj="gap" size="s">
          {value ?? getEmptyTagValue()}
        </EuiText>
      ),
      truncateText: true,
      width: '14%',
    },
    {
      field: 'current_status.last_look_back_date',
      name: i18n.COLUMN_LAST_LOOKBACK_DATE,
      render: (value: RuleStatus['current_status']['last_look_back_date']) => {
        return value == null ? (
          getEmptyTagValue()
        ) : (
          <FormattedDate value={value} fieldName={'last look back date'} />
        );
      },
      truncateText: true,
      width: '16%',
    },
    {
      field: 'current_status.status_date',
      name: i18n.COLUMN_LAST_COMPLETE_RUN,
      render: (value: RuleStatus['current_status']['status_date']) => {
        return value == null ? (
          getEmptyTagValue()
        ) : (
          <LocalizedDateTooltip fieldName={i18n.COLUMN_LAST_COMPLETE_RUN} date={new Date(value)}>
            <FormattedRelative value={value} />
          </LocalizedDateTooltip>
        );
      },
      truncateText: true,
      width: '20%',
    },
    {
      field: 'current_status.status',
      name: i18n.COLUMN_LAST_RESPONSE,
      render: (value: RuleStatus['current_status']['status']) => {
        return (
          <>
            <EuiHealth color={getStatusColor(value ?? null)}>
              {value ?? getEmptyTagValue()}
            </EuiHealth>
          </>
        );
      },
      width: '16%',
      truncateText: true,
    },
    {
      field: 'activate',
      name: i18n.COLUMN_ACTIVATE,
      render: (value: Rule['enabled']) => (
        <EuiText data-test-subj="search_after_time_durations" size="s">
          {value ? i18n.ACTIVE : i18n.INACTIVE}
        </EuiText>
      ),
      width: '95px',
    },
  ];

  return cols;
};
