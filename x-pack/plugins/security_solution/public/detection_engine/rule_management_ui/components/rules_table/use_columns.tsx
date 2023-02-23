/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiBasicTableColumn, EuiTableActionsColumnType } from '@elastic/eui';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiLink, EuiText, EuiToolTip } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import moment from 'moment';
import React, { useMemo } from 'react';
import type { SecurityJob } from '../../../../common/components/ml_popover/types';
import {
  DEFAULT_RELATIVE_DATE_THRESHOLD,
  SecurityPageName,
  SHOW_RELATED_INTEGRATIONS_SETTING,
} from '../../../../../common/constants';
import type {
  DurationMetric,
  RuleExecutionSummary,
} from '../../../../../common/detection_engine/rule_monitoring';
import { isMlRule } from '../../../../../common/machine_learning/helpers';
import { getEmptyTagValue } from '../../../../common/components/empty_value';
import { FormattedRelativePreferenceDate } from '../../../../common/components/formatted_date';
import { SecuritySolutionLinkAnchor } from '../../../../common/components/links';
import { getRuleDetailsTabUrl } from '../../../../common/components/link_to/redirect_to_detection_engine';
import { PopoverItems } from '../../../../common/components/popover_items';
import { useKibana, useUiSetting$ } from '../../../../common/lib/kibana';
import {
  canEditRuleWithActions,
  explainLackOfPermission,
} from '../../../../common/utils/privileges';
import { IntegrationsPopover } from '../../../../detections/components/rules/related_integrations/integrations_popover';
import { RuleStatusBadge } from '../../../../detections/components/rules/rule_execution_status';
import { RuleSwitch } from '../../../../detections/components/rules/rule_switch';
import { SeverityBadge } from '../../../../detections/components/rules/severity_badge';
import * as i18n from '../../../../detections/pages/detection_engine/rules/translations';
import { RuleDetailTabs } from '../../../rule_details_ui/pages/rule_details';
import type { Rule } from '../../../rule_management/logic';
import { PopoverTooltip } from './popover_tooltip';
import { useRulesTableContext } from './rules_table/rules_table_context';
import { TableHeaderTooltipCell } from './table_header_tooltip_cell';
import { useHasActionsPrivileges } from './use_has_actions_privileges';
import { useHasMlPermissions } from './use_has_ml_permissions';
import { useRulesTableActions } from './use_rules_table_actions';
import { MlRuleWarningPopover } from './ml_rule_warning_popover';

export type TableColumn = EuiBasicTableColumn<Rule> | EuiTableActionsColumnType<Rule>;

interface ColumnsProps {
  hasCRUDPermissions: boolean;
  isLoadingJobs: boolean;
  mlJobs: SecurityJob[];
  startMlJobs: (jobIds: string[] | undefined) => Promise<void>;
}

interface ActionColumnsProps {
  showExceptionsDuplicateConfirmation: () => Promise<string | null>;
}

const useEnabledColumn = ({ hasCRUDPermissions, startMlJobs }: ColumnsProps): TableColumn => {
  const hasMlPermissions = useHasMlPermissions();
  const hasActionsPrivileges = useHasActionsPrivileges();
  const { loadingRulesAction, loadingRuleIds } = useRulesTableContext().state;

  const loadingIds = useMemo(
    () =>
      ['disable', 'enable', 'edit', 'delete'].includes(loadingRulesAction ?? '')
        ? loadingRuleIds
        : [],
    [loadingRuleIds, loadingRulesAction]
  );

  return useMemo(
    () => ({
      field: 'enabled',
      name: i18n.COLUMN_ENABLE,
      render: (_, rule: Rule) => (
        <EuiToolTip
          position="top"
          content={explainLackOfPermission(
            rule,
            hasMlPermissions,
            hasActionsPrivileges,
            hasCRUDPermissions
          )}
        >
          <RuleSwitch
            id={rule.id}
            enabled={rule.enabled}
            startMlJobsIfNeeded={() => startMlJobs(rule.machine_learning_job_id)}
            isDisabled={
              !canEditRuleWithActions(rule, hasActionsPrivileges) ||
              !hasCRUDPermissions ||
              (isMlRule(rule.type) && !hasMlPermissions)
            }
            isLoading={loadingIds.includes(rule.id)}
          />
        </EuiToolTip>
      ),
      width: '95px',
      sortable: true,
    }),
    [hasMlPermissions, hasActionsPrivileges, hasCRUDPermissions, loadingIds, startMlJobs]
  );
};

export const RuleLink = ({ name, id }: Pick<Rule, 'id' | 'name'>) => {
  return (
    <EuiToolTip content={name} anchorClassName="eui-textTruncate">
      <SecuritySolutionLinkAnchor
        data-test-subj="ruleName"
        deepLinkId={SecurityPageName.rules}
        path={getRuleDetailsTabUrl(id, RuleDetailTabs.alerts)}
      >
        {name}
      </SecuritySolutionLinkAnchor>
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

const useRuleExecutionStatusColumn = ({
  sortable,
  width,
  isLoadingJobs,
  mlJobs,
}: {
  sortable: boolean;
  width: string;
  isLoadingJobs: boolean;
  mlJobs: SecurityJob[];
}): TableColumn => {
  return useMemo(
    () => ({
      field: 'execution_summary.last_execution.status',
      name: i18n.COLUMN_LAST_RESPONSE,
      render: (value: RuleExecutionSummary['last_execution']['status'] | undefined, item: Rule) => {
        return (
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <RuleStatusBadge
                status={value}
                message={item.execution_summary?.last_execution.message}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <MlRuleWarningPopover rule={item} loadingJobs={isLoadingJobs} jobs={mlJobs} />
            </EuiFlexItem>
          </EuiFlexGroup>
        );
      },
      sortable,
      truncateText: true,
      width,
    }),
    [isLoadingJobs, mlJobs, sortable, width]
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

const useActionsColumn = ({
  showExceptionsDuplicateConfirmation,
}: ActionColumnsProps): EuiTableActionsColumnType<Rule> => {
  const actions = useRulesTableActions({ showExceptionsDuplicateConfirmation });

  return useMemo(() => ({ actions, width: '40px' }), [actions]);
};

export interface UseColumnsProps extends ColumnsProps, ActionColumnsProps {}

export const useRulesColumns = ({
  hasCRUDPermissions,
  isLoadingJobs,
  mlJobs,
  startMlJobs,
  showExceptionsDuplicateConfirmation,
}: UseColumnsProps): TableColumn[] => {
  const actionsColumn = useActionsColumn({ showExceptionsDuplicateConfirmation });
  const ruleNameColumn = useRuleNameColumn();
  const [showRelatedIntegrations] = useUiSetting$<boolean>(SHOW_RELATED_INTEGRATIONS_SETTING);
  const enabledColumn = useEnabledColumn({
    hasCRUDPermissions,
    isLoadingJobs,
    mlJobs,
    startMlJobs,
  });
  const executionStatusColumn = useRuleExecutionStatusColumn({
    sortable: true,
    width: '16%',
    isLoadingJobs,
    mlJobs,
  });

  return useMemo(
    () => [
      ruleNameColumn,
      ...(showRelatedIntegrations ? [INTEGRATIONS_COLUMN] : []),
      TAGS_COLUMN,
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
        sortable: true,
        truncateText: true,
        width: '16%',
      },
      executionStatusColumn,
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
      enabledColumn,
      ...(hasCRUDPermissions ? [actionsColumn] : []),
    ],
    [
      actionsColumn,
      enabledColumn,
      executionStatusColumn,
      hasCRUDPermissions,
      ruleNameColumn,
      showRelatedIntegrations,
    ]
  );
};

export const useMonitoringColumns = ({
  hasCRUDPermissions,
  isLoadingJobs,
  mlJobs,
  startMlJobs,
  showExceptionsDuplicateConfirmation,
}: UseColumnsProps): TableColumn[] => {
  const docLinks = useKibana().services.docLinks;
  const actionsColumn = useActionsColumn({ showExceptionsDuplicateConfirmation });
  const ruleNameColumn = useRuleNameColumn();
  const [showRelatedIntegrations] = useUiSetting$<boolean>(SHOW_RELATED_INTEGRATIONS_SETTING);
  const enabledColumn = useEnabledColumn({
    hasCRUDPermissions,
    isLoadingJobs,
    mlJobs,
    startMlJobs,
  });
  const executionStatusColumn = useRuleExecutionStatusColumn({
    sortable: true,
    width: '12%',
    isLoadingJobs,
    mlJobs,
  });

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
        sortable: true,
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
        sortable: true,
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
            {value != null ? moment.duration(value, 'seconds').humanize() : getEmptyTagValue()}
          </EuiText>
        ),
        sortable: true,
        truncateText: true,
        width: '14%',
      },
      executionStatusColumn,
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
        sortable: true,
        truncateText: true,
        width: '16%',
      },
      enabledColumn,
      ...(hasCRUDPermissions ? [actionsColumn] : []),
    ],
    [
      actionsColumn,
      docLinks.links.siem.troubleshootGaps,
      enabledColumn,
      executionStatusColumn,
      hasCRUDPermissions,
      ruleNameColumn,
      showRelatedIntegrations,
    ]
  );
};
