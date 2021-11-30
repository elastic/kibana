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
  EuiToolTip,
  EuiIcon,
  EuiLink,
  EuiBadge,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import * as H from 'history';
import { sum } from 'lodash';
import React, { Dispatch } from 'react';

import { isMlRule } from '../../../../../../common/machine_learning/helpers';
import { Rule, RuleStatus } from '../../../../containers/detection_engine/rules';
import { getEmptyTagValue } from '../../../../../common/components/empty_value';
import { FormattedRelativePreferenceDate } from '../../../../../common/components/formatted_date';
import { getRuleDetailsUrl } from '../../../../../common/components/link_to/redirect_to_detection_engine';
import { ActionToaster } from '../../../../../common/components/toasters';
import { PopoverItems } from '../../../../../common/components/popover_items';
import { RuleSwitch } from '../../../../components/rules/rule_switch';
import { SeverityBadge } from '../../../../components/rules/severity_badge';
import { RuleExecutionStatusBadge } from '../../../../components/rules/rule_execution_status_badge';
import * as i18n from '../translations';
import {
  deleteRulesAction,
  duplicateRulesAction,
  editRuleAction,
  exportRulesAction,
} from './actions';
import { RulesTableAction } from '../../../../containers/detection_engine/rules/rules_table';
import { LinkAnchor } from '../../../../../common/components/links';
import { getToolTipContent, canEditRuleWithActions } from '../../../../../common/utils/privileges';
import { PopoverTooltip } from './popover_tooltip';

import {
  APP_UI_ID,
  SecurityPageName,
  DEFAULT_RELATIVE_DATE_THRESHOLD,
} from '../../../../../../common/constants';
import { DocLinksStart, NavigateToAppOptions } from '../../../../../../../../../src/core/public';

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
        <EuiToolTip content={value} anchorClassName="eui-textTruncate">
          <LinkAnchor
            data-test-subj="ruleName"
            onClick={(ev: { preventDefault: () => void }) => {
              ev.preventDefault();
              navigateToApp(APP_UI_ID, {
                deepLinkId: SecurityPageName.rules,
                path: getRuleDetailsUrl(item.id),
              });
            }}
            href={formatUrl(getRuleDetailsUrl(item.id))}
          >
            {value}
          </LinkAnchor>
        </EuiToolTip>
      ),
      width: '38%',
      sortable: true,
      truncateText: true,
    },
    {
      field: 'tags',
      name: null,
      align: 'center',
      render: (tags: Rule['tags']) => {
        if (tags.length === 0) {
          return null;
        }

        const renderItem = (tag: string, i: number) => (
          <EuiBadge color="hollow" key={`${tag}-${i}`} data-test-subj="tag">
            {tag}
          </EuiBadge>
        );
        return (
          <PopoverItems
            items={tags}
            popoverTitle={i18n.COLUMN_TAGS}
            popoverButtonTitle={tags.length.toString()}
            popoverButtonIcon="tag"
            dataTestPrefix="tags"
            renderItem={renderItem}
          />
        );
      },
      width: '65px',
      truncateText: true,
    },
    {
      field: 'risk_score',
      name: i18n.COLUMN_RISK_SCORE,
      render: (value: Rule['risk_score']) => (
        <EuiText data-test-subj="riskScore" size="s">
          {value}
        </EuiText>
      ),
      width: '85px',
      truncateText: true,
    },
    {
      field: 'severity',
      name: i18n.COLUMN_SEVERITY,
      render: (value: Rule['severity']) => <SeverityBadge value={value} />,
      width: '12%',
      truncateText: true,
    },
    {
      field: 'status_date',
      name: i18n.COLUMN_LAST_COMPLETE_RUN,
      render: (value: Rule['status_date']) => {
        return value == null ? (
          getEmptyTagValue()
        ) : (
          <FormattedRelativePreferenceDate
            tooltipFieldName={i18n.COLUMN_LAST_COMPLETE_RUN}
            relativeThresholdInHrs={DEFAULT_RELATIVE_DATE_THRESHOLD}
            value={value}
            tooltipAnchorClassName="eui-textTruncate"
          />
        );
      },
      width: '16%',
      truncateText: true,
    },
    {
      field: 'status',
      name: i18n.COLUMN_LAST_RESPONSE,
      render: (value: Rule['status']) => <RuleExecutionStatusBadge status={value} />,
      width: '16%',
      truncateText: true,
    },
    {
      field: 'updated_at',
      name: i18n.COLUMN_LAST_UPDATE,
      render: (value: Rule['updated_at']) => {
        return value == null ? (
          getEmptyTagValue()
        ) : (
          <FormattedRelativePreferenceDate
            tooltipFieldName={i18n.COLUMN_LAST_UPDATE}
            relativeThresholdInHrs={DEFAULT_RELATIVE_DATE_THRESHOLD}
            value={value}
            tooltipAnchorClassName="eui-textTruncate"
          />
        );
      },
      sortable: true,
      width: '18%',
      truncateText: true,
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
      width: '65px',
      truncateText: true,
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
      truncateText: true,
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
  formatUrl: FormatUrl,
  docLinks: DocLinksStart
): RulesStatusesColumns[] => {
  const cols: RulesStatusesColumns[] = [
    {
      field: 'name',
      name: i18n.COLUMN_RULE,
      render: (value: RuleStatus['current_status']['status'], item: RuleStatusRowItemType) => {
        return (
          <EuiToolTip content={value} anchorClassName="eui-textTruncate">
            <LinkAnchor
              data-test-subj="ruleName"
              onClick={(ev: { preventDefault: () => void }) => {
                ev.preventDefault();
                navigateToApp(APP_UI_ID, {
                  deepLinkId: SecurityPageName.rules,
                  path: getRuleDetailsUrl(item.id),
                });
              }}
              href={formatUrl(getRuleDetailsUrl(item.id))}
            >
              {value}
            </LinkAnchor>
          </EuiToolTip>
        );
      },
      width: '28%',
      truncateText: true,
    },
    {
      field: 'current_status.bulk_create_time_durations',
      name: (
        <>
          {i18n.COLUMN_INDEXING_TIMES}
          <EuiToolTip content={i18n.COLUMN_INDEXING_TIMES_TOOLTIP}>
            <EuiIcon size="m" color="subdued" type="questionInCircle" style={{ marginLeft: 8 }} />
          </EuiToolTip>
        </>
      ),
      render: (value: RuleStatus['current_status']['bulk_create_time_durations']) => (
        <EuiText data-test-subj="bulk_create_time_durations" size="s">
          {value?.length ? sum(value.map(Number)).toFixed() : getEmptyTagValue()}
        </EuiText>
      ),
      width: '14%',
      truncateText: true,
    },
    {
      field: 'current_status.search_after_time_durations',
      name: (
        <>
          {i18n.COLUMN_QUERY_TIMES}
          <EuiToolTip content={i18n.COLUMN_QUERY_TIMES_TOOLTIP}>
            <EuiIcon size="m" color="subdued" type="questionInCircle" style={{ marginLeft: 8 }} />
          </EuiToolTip>
        </>
      ),
      render: (value: RuleStatus['current_status']['search_after_time_durations']) => (
        <EuiText data-test-subj="search_after_time_durations" size="s">
          {value?.length ? sum(value.map(Number)).toFixed() : getEmptyTagValue()}
        </EuiText>
      ),
      width: '14%',
      truncateText: true,
    },
    {
      field: 'current_status.gap',
      name: (
        <>
          {i18n.COLUMN_GAP}
          <PopoverTooltip columnName={i18n.COLUMN_GAP}>
            <EuiText style={{ width: 300 }}>
              <p>
                <FormattedMessage
                  defaultMessage="Duration of most recent gap in Rule execution. Adjust Rule look-back or {seeDocs} for mitigating gaps."
                  id="xpack.securitySolution.detectionEngine.rules.allRules.columns.gapTooltip"
                  values={{
                    seeDocs: (
                      <EuiLink href={`${docLinks.links.siem.troubleshootGaps}`} target="_blank">
                        {'see documentation'}
                      </EuiLink>
                    ),
                  }}
                />
              </p>
            </EuiText>
          </PopoverTooltip>
        </>
      ),
      render: (value: RuleStatus['current_status']['gap']) => (
        <EuiText data-test-subj="gap" size="s">
          {value ?? getEmptyTagValue()}
        </EuiText>
      ),
      width: '14%',
      truncateText: true,
    },
    {
      field: 'current_status.status',
      name: i18n.COLUMN_LAST_RESPONSE,
      render: (value: RuleStatus['current_status']['status']) => (
        <RuleExecutionStatusBadge status={value} />
      ),
      width: '12%',
      truncateText: true,
    },
    {
      field: 'current_status.status_date',
      name: i18n.COLUMN_LAST_COMPLETE_RUN,
      render: (value: RuleStatus['current_status']['status_date']) => {
        return value == null ? (
          getEmptyTagValue()
        ) : (
          <FormattedRelativePreferenceDate
            tooltipFieldName={i18n.COLUMN_LAST_COMPLETE_RUN}
            relativeThresholdInHrs={DEFAULT_RELATIVE_DATE_THRESHOLD}
            value={value}
            tooltipAnchorClassName="eui-textTruncate"
          />
        );
      },
      width: '18%',
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
