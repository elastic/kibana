/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useMemo, useState } from 'react';
import moment from 'moment';
import { i18n } from '@kbn/i18n';
import { AlertConsumers } from '@kbn/rule-data-utils';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiBasicTable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiLink,
  EuiButtonEmpty,
  EuiHealth,
  EuiText,
  EuiToolTip,
  EuiTableSortingType,
  EuiButtonIcon,
  EuiSelectableOption,
  EuiIcon,
  EuiScreenReaderOnly,
  RIGHT_ALIGNMENT,
} from '@elastic/eui';
import {
  RuleExecutionStatus,
  RuleExecutionStatusErrorReasons,
  formatDuration,
  parseDuration,
  MONITORING_HISTORY_LIMIT,
} from '@kbn/alerting-plugin/common';

import { rulesStatusesTranslationsMapping, ALERT_STATUS_LICENSE_ERROR } from '../translations';
import { getHealthColor } from './rule_execution_status_filter';
import {
  Rule,
  RuleTableItem,
  RuleTypeIndex,
  Pagination,
  Percentiles,
  TriggersActionsUiConfig,
  RuleTypeRegistryContract,
  SnoozeSchedule,
} from '../../../../types';
import { shouldShowDurationWarning } from '../../../lib/execution_duration_utils';
import { PercentileSelectablePopover } from './percentile_selectable_popover';
import { RuleDurationFormat } from './rule_duration_format';
import { checkRuleTypeEnabled } from '../../../lib/check_rule_type_enabled';
import { getFormattedSuccessRatio } from '../../../lib/monitoring_utils';
import { hasAllPrivilege } from '../../../lib/capabilities';
import { RuleTagBadge } from './rule_tag_badge';
import { RuleStatusDropdown } from './rule_status_dropdown';
import { RulesListNotifyBadge } from './rules_list_notify_badge';
import {
  RulesListColumns,
  RulesListVisibleColumns,
  useRulesListColumnSelector,
} from './rules_list_column_selector';

interface RuleTypeState {
  isLoading: boolean;
  isInitialized: boolean;
  data: RuleTypeIndex;
}

export interface RuleState {
  isLoading: boolean;
  data: Rule[];
  totalItemCount: number;
}

const percentileOrdinals = {
  [Percentiles.P50]: '50th',
  [Percentiles.P95]: '95th',
  [Percentiles.P99]: '99th',
};

export const percentileFields = {
  [Percentiles.P50]: 'monitoring.execution.calculated_metrics.p50',
  [Percentiles.P95]: 'monitoring.execution.calculated_metrics.p95',
  [Percentiles.P99]: 'monitoring.execution.calculated_metrics.p99',
};

const EMPTY_OBJECT = {};
const EMPTY_HANDLER = () => {};
const EMPTY_RENDER = () => null;

interface ConvertRulesToTableItemsOpts {
  rules: Rule[];
  ruleTypeIndex: RuleTypeIndex;
  canExecuteActions: boolean;
  config: TriggersActionsUiConfig;
}

export interface RulesListTableProps {
  rulesListKey?: string;
  rulesState: RuleState;
  ruleTypesState: RuleTypeState;
  ruleTypeRegistry: RuleTypeRegistryContract;
  isLoading?: boolean;
  sort: EuiTableSortingType<RuleTableItem>['sort'];
  page: Pagination;
  percentileOptions: EuiSelectableOption[];
  canExecuteActions: boolean;
  itemIdToExpandedRowMap?: Record<string, React.ReactNode>;
  config: TriggersActionsUiConfig;
  onSort?: (sort: EuiTableSortingType<RuleTableItem>['sort']) => void;
  onPage?: (page: Pagination) => void;
  onRuleClick?: (rule: RuleTableItem) => void;
  onRuleEditClick?: (rule: RuleTableItem) => void;
  onRuleDeleteClick?: (rule: RuleTableItem) => void;
  onManageLicenseClick?: (rule: RuleTableItem) => void;
  onTagClick?: (rule: RuleTableItem) => void;
  onTagClose?: (rule: RuleTableItem) => void;
  onSelectionChange?: (updatedSelectedItemsList: RuleTableItem[]) => void;
  onPercentileOptionsChange?: (options: EuiSelectableOption[]) => void;
  onRuleChanged: () => Promise<void>;
  onEnableRule: (rule: RuleTableItem) => Promise<void>;
  onDisableRule: (rule: RuleTableItem) => Promise<void>;
  onSnoozeRule: (rule: RuleTableItem, snoozeSchedule: SnoozeSchedule) => Promise<void>;
  onUnsnoozeRule: (rule: RuleTableItem, scheduleIds?: string[]) => Promise<void>;
  renderCollapsedItemActions?: (
    rule: RuleTableItem,
    onLoading: (isLoading: boolean) => void
  ) => React.ReactNode;
  renderRuleError?: (rule: RuleTableItem) => React.ReactNode;
  visibleColumns?: RulesListVisibleColumns[];
}

interface ConvertRulesToTableItemsOpts {
  rules: Rule[];
  ruleTypeIndex: RuleTypeIndex;
  canExecuteActions: boolean;
  config: TriggersActionsUiConfig;
}

export function convertRulesToTableItems(opts: ConvertRulesToTableItemsOpts): RuleTableItem[] {
  const { rules, ruleTypeIndex, canExecuteActions, config } = opts;
  const minimumDuration = config.minimumScheduleInterval
    ? parseDuration(config.minimumScheduleInterval.value)
    : 0;
  return rules.map((rule, index: number) => {
    return {
      ...rule,
      index,
      actionsCount: rule.actions.length,
      ruleType: ruleTypeIndex.get(rule.ruleTypeId)?.name ?? rule.ruleTypeId,
      isEditable:
        hasAllPrivilege(rule, ruleTypeIndex.get(rule.ruleTypeId)) &&
        (canExecuteActions || (!canExecuteActions && !rule.actions.length)),
      enabledInLicense: !!ruleTypeIndex.get(rule.ruleTypeId)?.enabledInLicense,
      showIntervalWarning: parseDuration(rule.schedule.interval) < minimumDuration,
    };
  });
}

export const RulesListTable = (props: RulesListTableProps) => {
  const {
    rulesListKey,
    rulesState,
    ruleTypesState,
    ruleTypeRegistry,
    isLoading = false,
    canExecuteActions = false,
    sort,
    page,
    percentileOptions,
    itemIdToExpandedRowMap = EMPTY_OBJECT,
    config = EMPTY_OBJECT as TriggersActionsUiConfig,
    onSort = EMPTY_HANDLER,
    onPage = EMPTY_HANDLER,
    onRuleClick = EMPTY_HANDLER,
    onRuleEditClick = EMPTY_HANDLER,
    onRuleDeleteClick = EMPTY_HANDLER,
    onManageLicenseClick = EMPTY_HANDLER,
    onSelectionChange = EMPTY_HANDLER,
    onPercentileOptionsChange = EMPTY_HANDLER,
    onRuleChanged,
    onEnableRule = EMPTY_HANDLER,
    onDisableRule = EMPTY_HANDLER,
    onSnoozeRule = EMPTY_HANDLER,
    onUnsnoozeRule = EMPTY_HANDLER,
    renderCollapsedItemActions = EMPTY_RENDER,
    renderRuleError = EMPTY_RENDER,
    visibleColumns,
  } = props;

  const [tagPopoverOpenIndex, setTagPopoverOpenIndex] = useState<number>(-1);
  const [currentlyOpenNotify, setCurrentlyOpenNotify] = useState<string>();
  const [isLoadingMap, setIsLoadingMap] = useState<Record<string, boolean>>({});

  const selectedPercentile = useMemo(() => {
    const selectedOption = percentileOptions.find((option) => option.checked === 'on');
    if (selectedOption) {
      return Percentiles[selectedOption.key as Percentiles];
    }
  }, [percentileOptions]);

  const onLoading = (id: string, newIsLoading: boolean) => {
    setIsLoadingMap((prevState) => ({
      ...prevState,
      [id]: newIsLoading,
    }));
  };

  const renderPercentileColumnName = useCallback(() => {
    return (
      <span data-test-subj={`rulesTable-${selectedPercentile}ColumnName`}>
        <EuiToolTip
          content={i18n.translate(
            'xpack.triggersActionsUI.sections.rulesList.rulesListTable.columns.ruleExecutionPercentileTooltip',
            {
              defaultMessage: `{percentileOrdinal} percentile of this rule's past {sampleLimit} run durations (mm:ss).`,
              values: {
                percentileOrdinal: percentileOrdinals[selectedPercentile!],
                sampleLimit: MONITORING_HISTORY_LIMIT,
              },
            }
          )}
        >
          <span>
            {selectedPercentile}&nbsp;
            <EuiIcon size="s" color="subdued" type="questionInCircle" className="eui-alignTop" />
          </span>
        </EuiToolTip>
        <PercentileSelectablePopover
          options={percentileOptions}
          onOptionsChange={onPercentileOptionsChange}
        />
      </span>
    );
  }, [onPercentileOptionsChange, percentileOptions, selectedPercentile]);

  const renderPercentileCellValue = useCallback(
    (value: number) => {
      return (
        <span data-test-subj={`${selectedPercentile}Percentile`}>
          <RuleDurationFormat allowZero={false} duration={value} />
        </span>
      );
    },
    [selectedPercentile]
  );

  const isRuleTypeEditableInContext = useCallback(
    (ruleTypeId: string) =>
      ruleTypeRegistry.has(ruleTypeId)
        ? !ruleTypeRegistry.get(ruleTypeId).requiresAppContext
        : false,
    [ruleTypeRegistry]
  );

  const renderRuleStatusDropdown = useCallback(
    (ruleEnabled: boolean | undefined, rule: RuleTableItem) => {
      return (
        <RuleStatusDropdown
          hideSnoozeOption
          disableRule={async () => await onDisableRule(rule)}
          enableRule={async () => await onEnableRule(rule)}
          snoozeRule={async () => {}}
          unsnoozeRule={async () => {}}
          rule={rule}
          onRuleChanged={onRuleChanged}
          isEditable={rule.isEditable && isRuleTypeEditableInContext(rule.ruleTypeId)}
        />
      );
    },
    [isRuleTypeEditableInContext, onDisableRule, onEnableRule, onRuleChanged]
  );

  const renderRuleExecutionStatus = useCallback(
    (executionStatus: RuleExecutionStatus, rule: RuleTableItem) => {
      const healthColor = getHealthColor(executionStatus.status);
      const tooltipMessage =
        executionStatus.status === 'error' ? `Error: ${executionStatus?.error?.message}` : null;
      const isLicenseError =
        executionStatus.error?.reason === RuleExecutionStatusErrorReasons.License;
      const statusMessage = isLicenseError
        ? ALERT_STATUS_LICENSE_ERROR
        : rulesStatusesTranslationsMapping[executionStatus.status];

      const health = (
        <EuiHealth data-test-subj={`ruleStatus-${executionStatus.status}`} color={healthColor}>
          {statusMessage}
        </EuiHealth>
      );

      const healthWithTooltip = tooltipMessage ? (
        <EuiToolTip
          data-test-subj="ruleStatus-error-tooltip"
          position="top"
          content={tooltipMessage}
        >
          {health}
        </EuiToolTip>
      ) : (
        health
      );

      return (
        <EuiFlexGroup gutterSize="none">
          <EuiFlexItem>{healthWithTooltip}</EuiFlexItem>
          {isLicenseError && (
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                size="xs"
                data-test-subj="ruleStatus-error-license-fix"
                onClick={() => onManageLicenseClick(rule)}
              >
                <FormattedMessage
                  id="xpack.triggersActionsUI.sections.rulesList.fixLicenseLink"
                  defaultMessage="Fix"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      );
    },
    [onManageLicenseClick]
  );

  const getRulesTableColumns = useCallback((): RulesListColumns[] => {
    return [
      {
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
      },
      {
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
      },
      {
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
                  <EuiFlexItem grow={false}>
                    {moment(date).format('MMM D, YYYY HH:mm:ssa')}
                  </EuiFlexItem>
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
      },
      {
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
      },
      {
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
                            minimumInterval: formatDuration(
                              config.minimumScheduleInterval!.value,
                              true
                            ),
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
      },
      {
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
      },
      {
        id: 'ruleExecutionPercentile',
        mobileOptions: { header: false },
        selectorName: i18n.translate(
          'xpack.triggersActionsUI.sections.rulesList.rulesListTable.columns.selector.percentileTitle',
          { defaultMessage: 'Percentile' }
        ),
        field: percentileFields[selectedPercentile!],
        width: '16%',
        name: renderPercentileColumnName(),
        'data-test-subj': 'rulesTableCell-ruleExecutionPercentile',
        sortable: true,
        truncateText: false,
        render: renderPercentileCellValue,
      },
      {
        id: 'ruleExecutionSuccessRatio',
        field: 'monitoring.execution.calculated_metrics.success_ratio',
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
      },
      {
        id: 'ruleExecutionStatus',
        field: 'executionStatus.status',
        name: i18n.translate(
          'xpack.triggersActionsUI.sections.rulesList.rulesListTable.columns.lastResponseTitle',
          { defaultMessage: 'Last response' }
        ),
        sortable: true,
        truncateText: false,
        width: '120px',
        'data-test-subj': 'rulesTableCell-lastResponse',
        render: (_executionStatus: RuleExecutionStatus, rule: RuleTableItem) => {
          return renderRuleExecutionStatus(rule.executionStatus, rule);
        },
      },
      {
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
          return renderRuleStatusDropdown(rule.enabled, rule);
        },
      },
      {
        name: '',
        width: '90px',
        render(rule: RuleTableItem) {
          return (
            <EuiFlexGroup justifyContent="flexEnd" gutterSize="none">
              <EuiFlexItem grow={false} className="ruleSidebarItem">
                <EuiFlexGroup justifyContent="flexEnd" gutterSize="xs">
                  {rule.isEditable && isRuleTypeEditableInContext(rule.ruleTypeId) ? (
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
                {renderCollapsedItemActions(rule, (newIsLoading) =>
                  onLoading(rule.id, newIsLoading)
                )}
              </EuiFlexItem>
            </EuiFlexGroup>
          );
        },
      },
      {
        align: RIGHT_ALIGNMENT,
        width: '40px',
        isExpander: true,
        name: (
          <EuiScreenReaderOnly>
            <span>Expand rows</span>
          </EuiScreenReaderOnly>
        ),
        render: renderRuleError,
      },
    ];
  }, [
    config.minimumScheduleInterval,
    currentlyOpenNotify,
    isLoadingMap,
    isRuleTypeEditableInContext,
    onRuleChanged,
    onRuleClick,
    onRuleDeleteClick,
    onRuleEditClick,
    onSnoozeRule,
    onUnsnoozeRule,
    renderCollapsedItemActions,
    renderPercentileCellValue,
    renderPercentileColumnName,
    renderRuleError,
    renderRuleExecutionStatus,
    renderRuleStatusDropdown,
    ruleTypesState.data,
    selectedPercentile,
    tagPopoverOpenIndex,
  ]);

  const allRuleColumns = useMemo(() => getRulesTableColumns(), [getRulesTableColumns]);

  const [rulesListColumns, ColumnSelector] = useRulesListColumnSelector({
    allRuleColumns,
    rulesListKey,
    visibleColumns,
  });

  return (
    <EuiFlexGroup gutterSize="none" direction="column">
      <EuiFlexItem>{ColumnSelector}</EuiFlexItem>
      <EuiFlexItem>
        <EuiBasicTable
          loading={isLoading}
          /* Don't display rules until we have the rule types initialized */
          items={
            ruleTypesState.isInitialized === false
              ? []
              : convertRulesToTableItems({
                  rules: rulesState.data,
                  ruleTypeIndex: ruleTypesState.data,
                  canExecuteActions,
                  config,
                })
          }
          itemId="id"
          columns={rulesListColumns}
          sorting={{ sort }}
          rowProps={(rule: RuleTableItem) => ({
            'data-test-subj': 'rule-row',
            className: !ruleTypesState.data.get(rule.ruleTypeId)?.enabledInLicense
              ? 'actRulesList__tableRowDisabled'
              : '',
          })}
          cellProps={(rule: RuleTableItem) => ({
            'data-test-subj': 'cell',
            className: !ruleTypesState.data.get(rule.ruleTypeId)?.enabledInLicense
              ? 'actRulesList__tableCellDisabled'
              : '',
          })}
          data-test-subj="rulesList"
          pagination={{
            pageIndex: page.index,
            pageSize: page.size,
            /* Don't display rule count until we have the rule types initialized */
            totalItemCount: ruleTypesState.isInitialized === false ? 0 : rulesState.totalItemCount,
          }}
          selection={{
            selectable: (rule: RuleTableItem) => rule.isEditable,
            onSelectionChange,
          }}
          onChange={({
            page: changedPage,
            sort: changedSort,
          }: {
            page?: Pagination;
            sort?: EuiTableSortingType<RuleTableItem>['sort'];
          }) => {
            if (changedPage) {
              onPage(changedPage);
            }
            if (changedSort) {
              onSort(changedSort);
            }
          }}
          itemIdToExpandedRowMap={itemIdToExpandedRowMap}
          isExpandable={true}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
