/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import moment from 'moment';
import { i18n } from '@kbn/i18n';
import { AlertConsumers } from '@kbn/rule-data-utils';
import { RuleExecutionStatus, formatDuration } from '@kbn/alerting-plugin/common';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiLink,
  EuiText,
  EuiToolTip,
  EuiButtonIcon,
  EuiIcon,
  EuiScreenReaderOnly,
  RIGHT_ALIGNMENT,
} from '@elastic/eui';
import { checkRuleTypeEnabled } from '../../../../lib/check_rule_type_enabled';
import { shouldShowDurationWarning } from '../../../../lib/execution_duration_utils';
import { getFormattedSuccessRatio } from '../../../../lib/monitoring_utils';
import { RuleTagBadge } from '../rule_tag_badge';
import { RuleDurationFormat } from '../rule_duration_format';
import { RulesListNotifyBadge } from '../notify_badge';
import { RulesListTableStatusCell } from './rules_list_table_status_cell';
import { RuleStatusDropdown } from '../rule_status_dropdown';
import { PercentileColumnHeader, PercentileColumnHeaderProps } from './percentile_column_header';
import {
  RuleTableItem,
  Percentiles,
  TriggersActionsUiConfig,
  SnoozeSchedule,
  RuleTypeState,
  RuleTypeRegistryContract,
} from '../../../../../types';

export const isRuleTypeEditableInContext = (
  ruleTypeRegistry: RuleTypeRegistryContract,
  ruleTypeId: string
) => {
  return ruleTypeRegistry.has(ruleTypeId)
    ? !ruleTypeRegistry.get(ruleTypeId).requiresAppContext
    : false;
};

export const percentileFields = {
  [Percentiles.P50]: 'monitoring.run.calculated_metrics.p50',
  [Percentiles.P95]: 'monitoring.run.calculated_metrics.p95',
  [Percentiles.P99]: 'monitoring.run.calculated_metrics.p99',
};

export const getNameColumn = ({
  ruleTypesState,
  onRuleClick,
}: {
  ruleTypesState: RuleTypeState;
  onRuleClick: (rule: RuleTableItem) => void;
}) => ({
  id: 'ruleName',
  field: 'name',
  name: i18n.translate(
    'xpack.triggersActionsUI.sections.rulesList.rulesListTable.columns.nameTitle',
    { defaultMessage: 'Name' }
  ),
  sortable: true,
  truncateText: true,
  width: '25%',
  'data-test-subj': 'rulesTableCell-name',
  render: (name: string, rule: RuleTableItem) => {
    const ruleType = ruleTypesState.data.get(rule.ruleTypeId);
    const checkEnabledResult = checkRuleTypeEnabled(ruleType);
    const link = (
      <>
        <EuiFlexGroup direction="column" gutterSize="xs">
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="xs">
              <EuiFlexItem grow={false}>
                <EuiLink title={name} onClick={() => onRuleClick(rule)}>
                  {name}
                </EuiLink>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                {!checkEnabledResult.isEnabled && (
                  <EuiIconTip
                    anchorClassName="ruleDisabledQuestionIcon"
                    data-test-subj="ruleDisabledByLicenseTooltip"
                    type="questionInCircle"
                    content={checkEnabledResult.message}
                    position="right"
                  />
                )}
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText color="subdued" size="xs">
              {rule.ruleType}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </>
    );
    return <>{link}</>;
  },
});

export const getTagsColumn = ({
  tagPopoverOpenIndex,
  setTagPopoverOpenIndex,
}: {
  tagPopoverOpenIndex: number;
  setTagPopoverOpenIndex: (index: number) => void;
}) => ({
  id: 'ruleTags',
  field: 'tags',
  selectorName: i18n.translate(
    'xpack.triggersActionsUI.sections.rulesList.rulesListTable.columns.selector.tagsTitle',
    { defaultMessage: 'Tags' }
  ),
  name: '',
  sortable: false,
  width: '50px',
  'data-test-subj': 'rulesTableCell-tagsPopover',
  render: (ruleTags: string[], rule: RuleTableItem) => {
    return ruleTags.length > 0 ? (
      <RuleTagBadge
        isOpen={tagPopoverOpenIndex === rule.index}
        tags={ruleTags}
        onClick={() => setTagPopoverOpenIndex(rule.index)}
        onClose={() => setTagPopoverOpenIndex(-1)}
      />
    ) : null;
  },
});

export const getLastExecutionDateColumn = () => ({
  id: 'ruleExecutionStatusLastDate',
  field: 'executionStatus.lastExecutionDate',
  selectorName: i18n.translate(
    'xpack.triggersActionsUI.sections.rulesList.rulesListTable.columns.selector.lastRunTitle',
    { defaultMessage: 'Last run' }
  ),
  name: (
    <EuiToolTip
      data-test-subj="rulesTableCell-lastExecutionDateTooltip"
      content={i18n.translate(
        'xpack.triggersActionsUI.sections.rulesList.rulesListTable.columns.lastExecutionDateTitle',
        {
          defaultMessage: 'Start time of the last run.',
        }
      )}
    >
      <span>
        Last run{' '}
        <EuiIcon size="s" color="subdued" type="questionInCircle" className="eui-alignTop" />
      </span>
    </EuiToolTip>
  ),
  sortable: true,
  width: '20%',
  'data-test-subj': 'rulesTableCell-lastExecutionDate',
  render: (date: Date) => {
    if (date) {
      return (
        <>
          <EuiFlexGroup direction="column" gutterSize="none">
            <EuiFlexItem grow={false}>{moment(date).format('MMM D, YYYY HH:mm:ssa')}</EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText color="subdued" size="xs">
                {moment(date).fromNow()}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      );
    }
  },
});

export const getSnoozeNotifyColumn = ({
  isLoadingMap,
  currentlyOpenNotify,
  setCurrentlyOpenNotify,
  onLoading,
  onRuleChanged,
  onSnoozeRule,
  onUnsnoozeRule,
}: {
  isLoadingMap: Record<string, boolean>;
  currentlyOpenNotify?: string;
  setCurrentlyOpenNotify: (id: string) => void;
  onLoading: (id: string, isLoading: boolean) => void;
  onRuleChanged: () => Promise<void>;
  onSnoozeRule: (rule: RuleTableItem, snoozeSchedule: SnoozeSchedule) => Promise<void>;
  onUnsnoozeRule: (rule: RuleTableItem, scheduleIds?: string[]) => Promise<void>;
}) => ({
  id: 'ruleSnoozeNotify',
  selectorName: i18n.translate(
    'xpack.triggersActionsUI.sections.rulesList.rulesListTable.columns.selector.notifyTitle',
    { defaultMessage: 'Notify' }
  ),
  name: (
    <EuiToolTip
      data-test-subj="rulesTableCell-notifyTooltip"
      content={i18n.translate(
        'xpack.triggersActionsUI.sections.rulesList.rulesListTable.columns.notifyTooltip',
        {
          defaultMessage: 'Snooze notifications for a rule.',
        }
      )}
    >
      <span>
        {i18n.translate(
          'xpack.triggersActionsUI.sections.rulesList.rulesListTable.columns.notifyTitle',
          {
            defaultMessage: 'Notify',
          }
        )}
        &nbsp;
        <EuiIcon size="s" color="subdued" type="questionInCircle" className="eui-alignTop" />
      </span>
    </EuiToolTip>
  ),
  width: '14%',
  'data-test-subj': 'rulesTableCell-rulesListNotify',
  render: (rule: RuleTableItem) => {
    if (rule.consumer === AlertConsumers.SIEM || !rule.enabled) {
      return null;
    }
    return (
      <RulesListNotifyBadge
        showOnHover
        rule={rule}
        isLoading={!!isLoadingMap[rule.id]}
        onLoading={(newIsLoading) => onLoading(rule.id, newIsLoading)}
        isOpen={currentlyOpenNotify === rule.id}
        onClick={() => setCurrentlyOpenNotify(rule.id)}
        onClose={() => setCurrentlyOpenNotify('')}
        onRuleChanged={onRuleChanged}
        snoozeRule={async (snoozeSchedule) => {
          await onSnoozeRule(rule, snoozeSchedule);
        }}
        unsnoozeRule={async (scheduleIds) => await onUnsnoozeRule(rule, scheduleIds)}
      />
    );
  },
});

export const getScheduleIntervalColumn = ({
  config,
  onRuleEditClick,
}: {
  config: TriggersActionsUiConfig;
  onRuleEditClick: (rule: RuleTableItem) => void;
}) => ({
  id: 'ruleScheduleInterval',
  field: 'schedule.interval',
  width: '6%',
  name: i18n.translate(
    'xpack.triggersActionsUI.sections.rulesList.rulesListTable.columns.scheduleTitle',
    { defaultMessage: 'Interval' }
  ),
  sortable: false,
  truncateText: false,
  'data-test-subj': 'rulesTableCell-interval',
  render: (interval: string, rule: RuleTableItem) => {
    const durationString = formatDuration(interval);
    return (
      <>
        <EuiFlexGroup direction="row" gutterSize="xs">
          <EuiFlexItem grow={false}>{durationString}</EuiFlexItem>
          <EuiFlexItem grow={false}>
            {rule.showIntervalWarning && (
              <EuiToolTip
                data-test-subj={`ruleInterval-config-tooltip-${rule.index}`}
                title={i18n.translate(
                  'xpack.triggersActionsUI.sections.rulesList.rulesListTable.columns.intervalTooltipTitle',
                  {
                    defaultMessage: 'Below configured minimum interval',
                  }
                )}
                content={i18n.translate(
                  'xpack.triggersActionsUI.sections.rulesList.rulesListTable.columns.intervalTooltipText',
                  {
                    defaultMessage:
                      'Rule interval of {interval} is below the minimum configured interval of {minimumInterval}. This may impact alerting performance.',
                    values: {
                      minimumInterval: formatDuration(config.minimumScheduleInterval!.value, true),
                      interval: formatDuration(interval, true),
                    },
                  }
                )}
                position="top"
              >
                <EuiButtonIcon
                  color="text"
                  data-test-subj={`ruleInterval-config-icon-${rule.index}`}
                  onClick={() => onRuleEditClick(rule)}
                  iconType="flag"
                  aria-label={i18n.translate(
                    'xpack.triggersActionsUI.sections.rulesList.rulesListTable.columns.intervalIconAriaLabel',
                    { defaultMessage: 'Below configured minimum interval' }
                  )}
                />
              </EuiToolTip>
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </>
    );
  },
});

export const getLastDurationColumn = ({ ruleTypesState }: { ruleTypesState: RuleTypeState }) => ({
  id: 'ruleExecutionStatusLastDuration',
  field: 'executionStatus.lastDuration',
  width: '12%',
  selectorName: i18n.translate(
    'xpack.triggersActionsUI.sections.rulesList.rulesListTable.columns.selector.durationTitle',
    { defaultMessage: 'Duration' }
  ),
  name: (
    <EuiToolTip
      data-test-subj="rulesTableCell-durationTooltip"
      content={i18n.translate(
        'xpack.triggersActionsUI.sections.rulesList.rulesListTable.columns.durationTitle',
        {
          defaultMessage: 'The length of time it took for the rule to run (mm:ss).',
        }
      )}
    >
      <span>
        Duration{' '}
        <EuiIcon size="s" color="subdued" type="questionInCircle" className="eui-alignTop" />
      </span>
    </EuiToolTip>
  ),
  sortable: true,
  truncateText: false,
  'data-test-subj': 'rulesTableCell-duration',
  render: (value: number, rule: RuleTableItem) => {
    const showDurationWarning = shouldShowDurationWarning(
      ruleTypesState.data.get(rule.ruleTypeId),
      value
    );

    return (
      <>
        {<RuleDurationFormat duration={value} />}
        {showDurationWarning && (
          <EuiIconTip
            data-test-subj="ruleDurationWarning"
            anchorClassName="ruleDurationWarningIcon"
            type="rule"
            color="warning"
            content={i18n.translate(
              'xpack.triggersActionsUI.sections.rulesList.ruleTypeExcessDurationMessage',
              {
                defaultMessage: `Duration exceeds the rule's expected run time.`,
              }
            )}
            position="right"
          />
        )}
      </>
    );
  },
});

export const getExecutionPercentileColumn = ({
  percentileOptions,
  selectedPercentile,
  onPercentileOptionsChange,
}: PercentileColumnHeaderProps) => ({
  id: 'ruleExecutionPercentile',
  mobileOptions: { header: false },
  selectorName: i18n.translate(
    'xpack.triggersActionsUI.sections.rulesList.rulesListTable.columns.selector.percentileTitle',
    { defaultMessage: 'Percentile' }
  ),
  field: percentileFields[selectedPercentile!],
  width: '16%',
  name: (
    <PercentileColumnHeader
      selectedPercentile={selectedPercentile}
      percentileOptions={percentileOptions}
      onPercentileOptionsChange={onPercentileOptionsChange}
    />
  ),
  'data-test-subj': 'rulesTableCell-ruleExecutionPercentile',
  sortable: true,
  truncateText: false,
  render: (value: number) => {
    return (
      <span data-test-subj={`${selectedPercentile}Percentile`}>
        <RuleDurationFormat allowZero={false} duration={value} />
      </span>
    );
  },
});

export const getExecutionSuccessRatioColumn = () => ({
  id: 'ruleExecutionSuccessRatio',
  field: 'monitoring.run.calculated_metrics.success_ratio',
  width: '12%',
  selectorName: i18n.translate(
    'xpack.triggersActionsUI.sections.rulesList.rulesListTable.columns.selector.successRatioTitle',
    { defaultMessage: 'Success ratio' }
  ),
  name: (
    <EuiToolTip
      data-test-subj="rulesTableCell-successRatioTooltip"
      content={i18n.translate(
        'xpack.triggersActionsUI.sections.rulesList.rulesListTable.columns.successRatioTitle',
        {
          defaultMessage: 'How often this rule runs successfully.',
        }
      )}
    >
      <span>
        Success ratio{' '}
        <EuiIcon size="s" color="subdued" type="questionInCircle" className="eui-alignTop" />
      </span>
    </EuiToolTip>
  ),
  sortable: true,
  truncateText: false,
  'data-test-subj': 'rulesTableCell-successRatio',
  render: (value: number) => {
    return (
      <span data-test-subj="successRatio">
        {value !== undefined ? getFormattedSuccessRatio(value) : 'N/A'}
      </span>
    );
  },
});

export const getRuleLastResponseColumn = ({
  ruleOutcomeColumnField,
  onManageLicenseClick,
}: {
  ruleOutcomeColumnField: string;
  onManageLicenseClick: (rule: RuleTableItem) => void;
}) => ({
  id: 'ruleExecutionStatus',
  field: ruleOutcomeColumnField,
  name: i18n.translate(
    'xpack.triggersActionsUI.sections.rulesList.rulesListTable.columns.lastResponseTitle',
    { defaultMessage: 'Last response' }
  ),
  sortable: true,
  truncateText: false,
  width: '120px',
  'data-test-subj': 'rulesTableCell-lastResponse',
  render: (_executionStatus: RuleExecutionStatus, rule: RuleTableItem) => {
    return <RulesListTableStatusCell rule={rule} onManageLicenseClick={onManageLicenseClick} />;
  },
});

export const getRuleStateColumn = ({
  ruleTypeRegistry,
  onDisableRule,
  onEnableRule,
  onRuleChanged,
}: {
  ruleTypeRegistry: RuleTypeRegistryContract;
  onDisableRule: (rule: RuleTableItem) => Promise<void>;
  onEnableRule: (rule: RuleTableItem) => Promise<void>;
  onRuleChanged: () => Promise<void>;
}) => ({
  id: 'ruleExecutionState',
  field: 'enabled',
  name: i18n.translate(
    'xpack.triggersActionsUI.sections.rulesList.rulesListTable.columns.stateTitle',
    { defaultMessage: 'State' }
  ),
  sortable: true,
  truncateText: false,
  width: '10%',
  'data-test-subj': 'rulesTableCell-status',
  render: (_enabled: boolean | undefined, rule: RuleTableItem) => {
    return (
      <RuleStatusDropdown
        hideSnoozeOption
        disableRule={async () => await onDisableRule(rule)}
        enableRule={async () => await onEnableRule(rule)}
        snoozeRule={async () => {}}
        unsnoozeRule={async () => {}}
        rule={rule}
        onRuleChanged={onRuleChanged}
        isEditable={
          rule.isEditable && isRuleTypeEditableInContext(ruleTypeRegistry, rule.ruleTypeId)
        }
      />
    );
  },
});

export const getRuleActionsColumn = ({
  ruleTypeRegistry,
  onRuleEditClick,
  onRuleDeleteClick,
  onLoading,
  renderCollapsedItemActions,
}: {
  ruleTypeRegistry: RuleTypeRegistryContract;
  onRuleEditClick: (rule: RuleTableItem) => void;
  onRuleDeleteClick: (rule: RuleTableItem) => void;
  onLoading: (id: string, newIsLoading: boolean) => void;
  renderCollapsedItemActions: (
    rule: RuleTableItem,
    onLoading: (isLoading: boolean) => void
  ) => React.ReactNode;
}) => ({
  name: '',
  width: '90px',
  render(rule: RuleTableItem) {
    return (
      <EuiFlexGroup justifyContent="flexEnd" gutterSize="none">
        <EuiFlexItem grow={false} className="ruleSidebarItem">
          <EuiFlexGroup justifyContent="flexEnd" gutterSize="xs">
            {rule.isEditable && isRuleTypeEditableInContext(ruleTypeRegistry, rule.ruleTypeId) ? (
              <EuiFlexItem grow={false} data-test-subj="ruleSidebarEditAction">
                <EuiButtonIcon
                  color={'primary'}
                  title={i18n.translate(
                    'xpack.triggersActionsUI.sections.rulesList.rulesListTable.columns.editButtonTooltip',
                    { defaultMessage: 'Edit' }
                  )}
                  className="ruleSidebarItem__action"
                  data-test-subj="editActionHoverButton"
                  onClick={() => onRuleEditClick(rule)}
                  iconType={'pencil'}
                  aria-label={i18n.translate(
                    'xpack.triggersActionsUI.sections.rulesList.rulesListTable.columns.editAriaLabel',
                    { defaultMessage: 'Edit' }
                  )}
                />
              </EuiFlexItem>
            ) : null}
            {rule.isEditable ? (
              <EuiFlexItem grow={false} data-test-subj="ruleSidebarDeleteAction">
                <EuiButtonIcon
                  color={'danger'}
                  title={i18n.translate(
                    'xpack.triggersActionsUI.sections.rulesList.rulesListTable.columns.deleteButtonTooltip',
                    { defaultMessage: 'Delete' }
                  )}
                  className="ruleSidebarItem__action"
                  data-test-subj="deleteActionHoverButton"
                  onClick={() => onRuleDeleteClick(rule)}
                  iconType={'trash'}
                  aria-label={i18n.translate(
                    'xpack.triggersActionsUI.sections.rulesList.rulesListTable.columns.deleteAriaLabel',
                    { defaultMessage: 'Delete' }
                  )}
                />
              </EuiFlexItem>
            ) : null}
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          {renderCollapsedItemActions(rule, (newIsLoading) => onLoading(rule.id, newIsLoading))}
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  },
});

export const getRuleErrorColumn = ({
  renderRuleError,
}: {
  renderRuleError: (rule: RuleTableItem) => React.ReactNode;
}) => ({
  align: RIGHT_ALIGNMENT,
  width: '40px',
  isExpander: true,
  name: (
    <EuiScreenReaderOnly>
      <span>Expand rows</span>
    </EuiScreenReaderOnly>
  ),
  render: renderRuleError,
});
