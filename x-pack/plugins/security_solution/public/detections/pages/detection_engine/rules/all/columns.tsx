/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
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
import { RulesTableAction } from '../../../../containers/detection_engine/rules/rules_table';
import { LocalizedDateTooltip } from '../../../../../common/components/localized_date_tooltip';
import { LinkAnchor } from '../../../../../common/components/links';
import { getToolTipContent, canEditRuleWithActions } from '../../../../../common/utils/privileges';
import { TagsDisplay } from './tag_display';
import { getRuleStatusText } from '../../../../../../common/detection_engine/utils';
import { APP_ID, SecurityPageName } from '../../../../../../common/constants';
import { NavigateToAppOptions } from '../../../../../../../../../src/core/public';

export const getActions = (
  dispatch: React.Dispatch<RulesTableAction>,
  dispatchToaster: Dispatch<ActionToaster>,
  history: H.History,
  navigateToApp: (appId: string, options?: NavigateToAppOptions | undefined) => Promise<void>,
  reFetchRules: () => Promise<void>,
  refetchPrePackagedRulesStatus: () => Promise<void>,
  actionsPrivileges:
    | boolean
    | Readonly<{
        [x: string]: boolean;
      }>
) => [
  {
    'data-test-subj': 'editRuleAction',
    description: i18n.EDIT_RULE_SETTINGS,
    name: !actionsPrivileges ? (
      <EuiToolTip position="left" content={i18n.EDIT_RULE_SETTINGS_TOOLTIP}>
        <>{i18n.EDIT_RULE_SETTINGS}</>
      </EuiToolTip>
    ) : (
      i18n.EDIT_RULE_SETTINGS
    ),
    icon: 'controlsHorizontal',
    onClick: (rowItem: Rule) => editRuleAction(rowItem.id, navigateToApp),
    enabled: (rowItem: Rule) => canEditRuleWithActions(rowItem, actionsPrivileges),
  },
  {
    'data-test-subj': 'duplicateRuleAction',
    description: i18n.DUPLICATE_RULE,
    icon: 'copy',
    name: !actionsPrivileges ? (
      <EuiToolTip position="left" content={i18n.EDIT_RULE_SETTINGS_TOOLTIP}>
        <>{i18n.DUPLICATE_RULE}</>
      </EuiToolTip>
    ) : (
      i18n.DUPLICATE_RULE
    ),
    enabled: (rowItem: Rule) => canEditRuleWithActions(rowItem, actionsPrivileges),
    onClick: async (rowItem: Rule) => {
      const createdRules = await duplicateRulesAction(
        [rowItem],
        [rowItem.id],
        dispatch,
        dispatchToaster
      );
      if (createdRules?.length) {
        editRuleAction(createdRules[0].id, navigateToApp);
      }
    },
  },
  {
    'data-test-subj': 'exportRuleAction',
    description: i18n.EXPORT_RULE,
    icon: 'exportAction',
    name: i18n.EXPORT_RULE,
    onClick: (rowItem: Rule) => exportRulesAction([rowItem.rule_id], dispatch, dispatchToaster),
    enabled: (rowItem: Rule) => !rowItem.immutable,
  },
  {
    'data-test-subj': 'deleteRuleAction',
    description: i18n.DELETE_RULE,
    icon: 'trash',
    name: i18n.DELETE_RULE,
    onClick: async (rowItem: Rule) => {
      await deleteRulesAction([rowItem.id], dispatch, dispatchToaster);
      await reFetchRules();
      await refetchPrePackagedRulesStatus();
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
  dispatch: React.Dispatch<RulesTableAction>;
  dispatchToaster: Dispatch<ActionToaster>;
  formatUrl: FormatUrl;
  history: H.History;
  hasMlPermissions: boolean;
  hasPermissions: boolean;
  loadingRuleIds: string[];
  navigateToApp: (appId: string, options?: NavigateToAppOptions | undefined) => Promise<void>;
  reFetchRules: () => Promise<void>;
  refetchPrePackagedRulesStatus: () => Promise<void>;
  hasReadActionsPrivileges:
    | boolean
    | Readonly<{
        [x: string]: boolean;
      }>;
}

export const getColumns = ({
  dispatch,
  dispatchToaster,
  formatUrl,
  history,
  hasMlPermissions,
  hasPermissions,
  loadingRuleIds,
  navigateToApp,
  reFetchRules,
  refetchPrePackagedRulesStatus,
  hasReadActionsPrivileges,
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
            navigateToApp(APP_ID, {
              deepLinkId: SecurityPageName.rules,
              path: getRuleDetailsUrl(item.id),
            });
          }}
          href={formatUrl(getRuleDetailsUrl(item.id))}
        >
          {value}
        </LinkAnchor>
      ),
      truncateText: true,
      width: '20%',
      sortable: true,
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
      width: '10%',
    },
    {
      field: 'severity',
      name: i18n.COLUMN_SEVERITY,
      render: (value: Rule['severity']) => <SeverityBadge value={value} />,
      truncateText: true,
      width: '12%',
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
      width: '14%',
    },
    {
      field: 'status',
      name: i18n.COLUMN_LAST_RESPONSE,
      render: (value: Rule['status']) => {
        return (
          <>
            <EuiHealth color={getStatusColor(value ?? null)}>
              {getRuleStatusText(value) ?? getEmptyTagValue()}
            </EuiHealth>
          </>
        );
      },
      width: '12%',
      truncateText: true,
    },
    {
      field: 'updated_at',
      name: i18n.COLUMN_LAST_UPDATE,
      render: (value: Rule['updated_at']) => {
        return value == null ? (
          getEmptyTagValue()
        ) : (
          <LocalizedDateTooltip fieldName={i18n.COLUMN_LAST_UPDATE} date={new Date(value)}>
            <FormattedDate value={value} fieldName={'last rule update date'} />
          </LocalizedDateTooltip>
        );
      },
      sortable: true,
      truncateText: true,
      width: '14%',
    },
    {
      field: 'version',
      name: i18n.COLUMN_VERSION,
      render: (value: Rule['version']) => {
        return value == null ? (
          getEmptyTagValue()
        ) : (
          <EuiText data-test-subj="version" size="s">
            {value}
          </EuiText>
        );
      },
      truncateText: true,
      width: '8%',
    },
    {
      field: 'tags',
      name: i18n.COLUMN_TAGS,
      render: (value: Rule['tags']) => {
        if (value.length > 0) {
          return <TagsDisplay tags={value} />;
        }
        return getEmptyTagValue();
      },
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
          content={getToolTipContent(item, hasMlPermissions, hasReadActionsPrivileges)}
        >
          <RuleSwitch
            data-test-subj="enabled"
            dispatch={dispatch}
            id={item.id}
            enabled={item.enabled}
            isDisabled={
              !canEditRuleWithActions(item, hasReadActionsPrivileges) ||
              !hasPermissions ||
              (isMlRule(item.type) && !hasMlPermissions && !item.enabled)
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
      actions: getActions(
        dispatch,
        dispatchToaster,
        history,
        navigateToApp,
        reFetchRules,
        refetchPrePackagedRulesStatus,
        hasReadActionsPrivileges
      ),
      width: '40px',
    } as EuiTableActionsColumnType<Rule>,
  ];

  return hasPermissions ? [...cols, ...actions] : cols;
};

export const getMonitoringColumns = (
  navigateToApp: (appId: string, options?: NavigateToAppOptions | undefined) => Promise<void>,
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
              navigateToApp(APP_ID, {
                deepLinkId: SecurityPageName.rules,
                path: getRuleDetailsUrl(item.id),
              });
            }}
            href={formatUrl(getRuleDetailsUrl(item.id))}
          >
            {/* Temporary fix if on upgrade a rule has a status of 'partial failure' we want to display that text as 'warning' */}
            {/* On the next subsequent rule run, that 'partial failure' status will be re-written as a 'warning' status */}
            {/* and this code will no longer be necessary */}
            {/* TODO: remove this code in 8.0.0 */}
            {value === 'partial failure' ? 'warning' : value}
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
              {getRuleStatusText(value) ?? getEmptyTagValue()}
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
