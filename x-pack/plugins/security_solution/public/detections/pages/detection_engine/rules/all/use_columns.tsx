/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiBasicTableColumn, EuiTableActionsColumnType } from '@elastic/eui';
import { EuiBadge, EuiLink, EuiIcon, EuiText, EuiToolTip } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useMemo } from 'react';
import { IntegrationsPopover } from '../../../../components/rules/related_integrations/integrations_popover';
import {
  APP_UI_ID,
  DEFAULT_RELATIVE_DATE_THRESHOLD,
  SecurityPageName,
  SHOW_RELATED_INTEGRATIONS_SETTING,
} from '../../../../../../common/constants';
import { isMlRule } from '../../../../../../common/machine_learning/helpers';
import { getEmptyTagValue } from '../../../../../common/components/empty_value';
import { FormattedRelativePreferenceDate } from '../../../../../common/components/formatted_date';
import { LinkAnchor } from '../../../../../common/components/links';
import { useFormatUrl } from '../../../../../common/components/link_to';
import { getRuleDetailsUrl } from '../../../../../common/components/link_to/redirect_to_detection_engine';
import { PopoverItems } from '../../../../../common/components/popover_items';
import { useKibana, useUiSetting$ } from '../../../../../common/lib/kibana';
import { canEditRuleWithActions, getToolTipContent } from '../../../../../common/utils/privileges';
import { RuleSwitch } from '../../../../components/rules/rule_switch';
import { SeverityBadge } from '../../../../components/rules/severity_badge';
import type { Rule } from '../../../../containers/detection_engine/rules';
import { useRulesTableContext } from './rules_table/rules_table_context';
import * as i18n from '../translations';
import { PopoverTooltip } from './popover_tooltip';
import { TableHeaderTooltipCell } from './table_header_tooltip_cell';
import { useHasActionsPrivileges } from './use_has_actions_privileges';
import { useHasMlPermissions } from './use_has_ml_permissions';
import { getRulesTableActions } from './rules_table_actions';
import { RuleStatusBadge } from '../../../../components/rules/rule_execution_status';
import type {
  DurationMetric,
  RuleExecutionSummary,
} from '../../../../../../common/detection_engine/rule_monitoring';
import { useAppToasts } from '../../../../../common/hooks/use_app_toasts';
import { useStartTransaction } from '../../../../../common/lib/apm/use_start_transaction';
import { useInvalidateRules } from '../../../../containers/detection_engine/rules/use_find_rules_query';
import { useInvalidatePrePackagedRulesStatus } from '../../../../containers/detection_engine/rules/use_pre_packaged_rules_status';

export type TableColumn = EuiBasicTableColumn<Rule> | EuiTableActionsColumnType<Rule>;

interface ColumnsProps {
  hasPermissions: boolean;
}

const useEnabledColumn = ({ hasPermissions }: ColumnsProps): TableColumn => {
  const hasMlPermissions = useHasMlPermissions();
  const hasActionsPrivileges = useHasActionsPrivileges();
  const { loadingRulesAction, loadingRuleIds } = useRulesTableContext().state;

  const loadingIds = useMemo(
    () => (['disable', 'enable', 'edit'].includes(loadingRulesAction ?? '') ? loadingRuleIds : []),
    [loadingRuleIds, loadingRulesAction]
  );

  return useMemo(
    () => ({
      field: 'enabled',
      name: i18n.COLUMN_ENABLE,
      render: (_, rule: Rule) => (
        <EuiToolTip
          position="top"
          content={getToolTipContent(rule, hasMlPermissions, hasActionsPrivileges)}
        >
          <RuleSwitch
            id={rule.id}
            enabled={rule.enabled}
            isDisabled={
              !canEditRuleWithActions(rule, hasActionsPrivileges) ||
              !hasPermissions ||
              (isMlRule(rule.type) && !hasMlPermissions && !rule.enabled)
            }
            isLoading={loadingIds.includes(rule.id)}
          />
        </EuiToolTip>
      ),
      width: '95px',
      sortable: true,
    }),
    [hasActionsPrivileges, hasMlPermissions, hasPermissions, loadingIds]
  );
};

export const RuleLink = ({ name, id }: Pick<Rule, 'id' | 'name'>) => {
  const { formatUrl } = useFormatUrl(SecurityPageName.rules);
  const { navigateToApp } = useKibana().services.application;

  return (
    <EuiToolTip content={name} anchorClassName="eui-textTruncate">
      <LinkAnchor
        data-test-subj="ruleName"
        onClick={(ev: { preventDefault: () => void }) => {
          ev.preventDefault();
          navigateToApp(APP_UI_ID, {
            deepLinkId: SecurityPageName.rules,
            path: getRuleDetailsUrl(id),
          });
        }}
        href={formatUrl(getRuleDetailsUrl(id))}
      >
        {name}
      </LinkAnchor>
    </EuiToolTip>
  );
};

const useRuleNameColumn = (): TableColumn => {
  return useMemo(
    () => ({
      field: 'name',
      name: i18n.COLUMN_RULE,
      render: (value: Rule['name'], item: Rule) => <RuleLink id={item.id} name={value} />,
      sortable: true,
      truncateText: true,
      width: '38%',
    }),
    []
  );
};

const TAGS_COLUMN: TableColumn = {
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
};

const INTEGRATIONS_COLUMN: TableColumn = {
  field: 'related_integrations',
  name: null,
  align: 'center',
  render: (integrations: Rule['related_integrations']) => {
    if (integrations == null || integrations.length === 0) {
      return null;
    }

    return <IntegrationsPopover relatedIntegrations={integrations} />;
  },
  width: '143px',
  truncateText: true,
};

const useActionsColumn = (): EuiTableActionsColumnType<Rule> => {
  const { navigateToApp } = useKibana().services.application;
  const hasActionsPrivileges = useHasActionsPrivileges();
  const toasts = useAppToasts();
  const { setLoadingRules } = useRulesTableContext().actions;
  const { startTransaction } = useStartTransaction();
  const invalidateRules = useInvalidateRules();
  const invalidatePrePackagedRulesStatus = useInvalidatePrePackagedRulesStatus();

  return useMemo(
    () => ({
      actions: getRulesTableActions({
        toasts,
        navigateToApp,
        invalidateRules,
        invalidatePrePackagedRulesStatus,
        actionsPrivileges: hasActionsPrivileges,
        setLoadingRules,
        startTransaction,
      }),
      width: '40px',
    }),
    [
      hasActionsPrivileges,
      invalidatePrePackagedRulesStatus,
      invalidateRules,
      navigateToApp,
      setLoadingRules,
      startTransaction,
      toasts,
    ]
  );
};

export const useRulesColumns = ({ hasPermissions }: ColumnsProps): TableColumn[] => {
  const { triggersActionsUi } = useKibana().services;
  const actionsColumn = useActionsColumn();
  const enabledColumn = useEnabledColumn({ hasPermissions });
  const ruleNameColumn = useRuleNameColumn();
  const {
    state: { isInMemorySorting, loadingRuleIds, isLoading },
    actions: { reFetchRules },
  } = useRulesTableContext();
  const [showRelatedIntegrations] = useUiSetting$<boolean>(SHOW_RELATED_INTEGRATIONS_SETTING);

  return useMemo(
    () => [
      ruleNameColumn,
      ...(showRelatedIntegrations ? [INTEGRATIONS_COLUMN] : []),
      TAGS_COLUMN,
      {
        id: 'ruleSnoozeNotify',
        name: (
          <EuiToolTip
            data-test-subj="rulesTableCell-notifyTooltip"
            content={i18n.COLUMN_NOTIFY_TOOLTIP}
          >
            <span>
              {i18n.COLUMN_NOTIFY}
              &nbsp;
              <EuiIcon size="s" color="subdued" type="questionInCircle" className="eui-alignTop" />
            </span>
          </EuiToolTip>
        ),
        width: '14%',
        'data-test-subj': 'rulesTableCell-rulesListNotify',
        render: (rule: Rule) => {
          return triggersActionsUi.getRulesListNotifyBadge({
            rule: {
              ...rule,
              muteAll: rule.mute_all ?? false,
              activeSnoozes: rule.active_snoozes,
              isSnoozedUntil: rule.is_snoozed_until,
              snoozeSchedule: rule?.snooze_schedule ?? [],
              isEditable: hasPermissions,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any,
            isLoading: loadingRuleIds.includes(rule.id) || isLoading,
            onRuleChanged: reFetchRules,
          });
        },
      },
      {
        field: 'risk_score',
        name: i18n.COLUMN_RISK_SCORE,
        render: (value: Rule['risk_score']) => (
          <EuiText data-test-subj="riskScore" size="s">
            {value}
          </EuiText>
        ),
        sortable: true,
        truncateText: true,
        width: '85px',
      },
      {
        field: 'severity',
        name: i18n.COLUMN_SEVERITY,
        render: (value: Rule['severity']) => <SeverityBadge value={value} />,
        sortable: true,
        truncateText: true,
        width: '12%',
      },
      {
        field: 'execution_summary.last_execution.date',
        name: i18n.COLUMN_LAST_COMPLETE_RUN,
        render: (value: RuleExecutionSummary['last_execution']['date'] | undefined) => {
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
        sortable: !!isInMemorySorting,
        truncateText: true,
        width: '16%',
      },
      {
        field: 'execution_summary.last_execution.status',
        name: i18n.COLUMN_LAST_RESPONSE,
        render: (value: RuleExecutionSummary['last_execution']['status'] | undefined) => (
          <RuleStatusBadge status={value} />
        ),
        sortable: !!isInMemorySorting,
        truncateText: true,
        width: '16%',
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
        sortable: !!isInMemorySorting,
        truncateText: true,
        width: '65px',
      },
      enabledColumn,
      ...(hasPermissions ? [actionsColumn] : []),
    ],
    [
      actionsColumn,
      enabledColumn,
      hasPermissions,
      isInMemorySorting,
      isLoading,
      loadingRuleIds,
      reFetchRules,
      ruleNameColumn,
      showRelatedIntegrations,
      triggersActionsUi,
    ]
  );
};

export const useMonitoringColumns = ({ hasPermissions }: ColumnsProps): TableColumn[] => {
  const docLinks = useKibana().services.docLinks;
  const actionsColumn = useActionsColumn();
  const enabledColumn = useEnabledColumn({ hasPermissions });
  const ruleNameColumn = useRuleNameColumn();
  const { isInMemorySorting } = useRulesTableContext().state;
  const [showRelatedIntegrations] = useUiSetting$<boolean>(SHOW_RELATED_INTEGRATIONS_SETTING);

  return useMemo(
    () => [
      {
        ...ruleNameColumn,
        width: '28%',
      },
      ...(showRelatedIntegrations ? [INTEGRATIONS_COLUMN] : []),
      TAGS_COLUMN,
      {
        field: 'execution_summary.last_execution.metrics.total_indexing_duration_ms',
        name: (
          <TableHeaderTooltipCell
            title={i18n.COLUMN_INDEXING_TIMES}
            tooltipContent={i18n.COLUMN_INDEXING_TIMES_TOOLTIP}
          />
        ),
        render: (value: DurationMetric | undefined) => (
          <EuiText data-test-subj="total_indexing_duration_ms" size="s">
            {value != null ? value.toFixed() : getEmptyTagValue()}
          </EuiText>
        ),
        sortable: !!isInMemorySorting,
        truncateText: true,
        width: '16%',
      },
      {
        field: 'execution_summary.last_execution.metrics.total_search_duration_ms',
        name: (
          <TableHeaderTooltipCell
            title={i18n.COLUMN_QUERY_TIMES}
            tooltipContent={i18n.COLUMN_QUERY_TIMES_TOOLTIP}
          />
        ),
        render: (value: DurationMetric | undefined) => (
          <EuiText data-test-subj="total_search_duration_ms" size="s">
            {value != null ? value.toFixed() : getEmptyTagValue()}
          </EuiText>
        ),
        sortable: !!isInMemorySorting,
        truncateText: true,
        width: '14%',
      },
      {
        field: 'execution_summary.last_execution.metrics.execution_gap_duration_s',
        name: (
          <TableHeaderTooltipCell
            title={i18n.COLUMN_GAP}
            customTooltip={
              <div style={{ maxWidth: '20px' }}>
                <PopoverTooltip columnName={i18n.COLUMN_GAP}>
                  <EuiText style={{ width: 300 }}>
                    <p>
                      <FormattedMessage
                        defaultMessage="Duration of most recent gap in Rule execution. Adjust Rule look-back or {seeDocs} for mitigating gaps."
                        id="xpack.securitySolution.detectionEngine.rules.allRules.columns.gapTooltip"
                        values={{
                          seeDocs: (
                            <EuiLink
                              href={`${docLinks.links.siem.troubleshootGaps}`}
                              target="_blank"
                            >
                              {i18n.COLUMN_GAP_TOOLTIP_SEE_DOCUMENTATION}
                            </EuiLink>
                          ),
                        }}
                      />
                    </p>
                  </EuiText>
                </PopoverTooltip>
              </div>
            }
          />
        ),
        render: (value: DurationMetric | undefined) => (
          <EuiText data-test-subj="gap" size="s">
            {value != null ? value.toFixed() : getEmptyTagValue()}
          </EuiText>
        ),
        sortable: !!isInMemorySorting,
        truncateText: true,
        width: '14%',
      },
      {
        field: 'execution_summary.last_execution.status',
        name: i18n.COLUMN_LAST_RESPONSE,
        render: (value: RuleExecutionSummary['last_execution']['status'] | undefined) => (
          <RuleStatusBadge status={value} />
        ),
        sortable: !!isInMemorySorting,
        truncateText: true,
        width: '12%',
      },
      {
        field: 'execution_summary.last_execution.date',
        name: i18n.COLUMN_LAST_COMPLETE_RUN,
        render: (value: RuleExecutionSummary['last_execution']['date'] | undefined) => {
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
        sortable: !!isInMemorySorting,
        truncateText: true,
        width: '16%',
      },
      enabledColumn,
      ...(hasPermissions ? [actionsColumn] : []),
    ],
    [
      actionsColumn,
      docLinks.links.siem.troubleshootGaps,
      enabledColumn,
      hasPermissions,
      isInMemorySorting,
      ruleNameColumn,
      showRelatedIntegrations,
    ]
  );
};
