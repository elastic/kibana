/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useMemo, useState } from 'react';
import numeral from '@elastic/numeral';
import { useUiSetting$ } from '@kbn/kibana-react-plugin/public';
import {
  EuiBasicTable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiText,
  EuiTableSortingType,
  EuiSelectableOption,
  EuiCheckbox,
  useEuiTheme,
} from '@elastic/eui';
import {
  SELECT_ALL_RULES,
  CLEAR_SELECTION,
  TOTAL_RULES,
  SELECT_ALL_ARIA_LABEL,
} from '../../translations';
import {
  Rule,
  RuleTableItem,
  RuleTypeState,
  Pagination,
  Percentiles,
  TriggersActionsUiConfig,
  RuleTypeRegistryContract,
  SnoozeSchedule,
  RulesListColumn,
  CustomRulesListColumn,
  RulesListColumnContext,
} from '../../../../../types';
import { DEFAULT_NUMBER_FORMAT } from '../../../../constants';
import { getIsExperimentalFeatureEnabled } from '../../../../../common/get_experimental_features';
import {
  useRulesListColumnSelector,
  originalRulesListVisibleColumns,
} from '../rules_list_column_selector';
import {
  getNameColumn,
  getTagsColumn,
  getLastExecutionDateColumn,
  getSnoozeNotifyColumn,
  getScheduleIntervalColumn,
  getLastDurationColumn,
  getExecutionPercentileColumn,
  getExecutionSuccessRatioColumn,
  getRuleLastResponseColumn,
  getRuleStateColumn,
  getRuleActionsColumn,
  getRuleErrorColumn,
} from './rules_list_table_columns';

export interface RuleState {
  isLoading: boolean;
  data: Rule[];
  totalItemCount: number;
}

const getCustomColumn = (column: CustomRulesListColumn, context: RulesListColumnContext) => {
  return {
    ...column,
    render: (value: unknown, rule: RuleTableItem) => column.render(value, rule, context),
  };
};

const EMPTY_OBJECT = {};
const EMPTY_HANDLER = () => {};
const EMPTY_RESOLVE = () => Promise.resolve();
const EMPTY_RENDER = () => null;

export interface RulesListTableProps {
  rulesListKey?: string;
  rulesState: RuleState;
  items: RuleTableItem[];
  ruleTypesState: RuleTypeState;
  ruleTypeRegistry: RuleTypeRegistryContract;
  isLoading?: boolean;
  sort: EuiTableSortingType<RuleTableItem>['sort'];
  page: Pagination;
  percentileOptions: EuiSelectableOption[];
  numberOfSelectedRules?: number;
  isPageSelected: boolean;
  isAllSelected: boolean;
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
  onPercentileOptionsChange?: (options: EuiSelectableOption[]) => void;
  onRuleChanged: () => Promise<void>;
  onEnableRule: (rule: RuleTableItem) => Promise<void>;
  onDisableRule: (rule: RuleTableItem) => Promise<void>;
  onSnoozeRule: (rule: RuleTableItem, snoozeSchedule: SnoozeSchedule) => Promise<void>;
  onUnsnoozeRule: (rule: RuleTableItem, scheduleIds?: string[]) => Promise<void>;
  onSelectAll: () => void;
  onSelectPage: () => void;
  onSelectRow: (rule: RuleTableItem) => void;
  isRowSelected: (rule: RuleTableItem) => boolean;
  renderSelectAllDropdown: () => React.ReactNode;
  renderCollapsedItemActions?: (
    rule: RuleTableItem,
    onLoading: (isLoading: boolean) => void
  ) => React.ReactNode;
  renderRuleError?: (rule: RuleTableItem) => React.ReactNode;
  columns?: CustomRulesListColumn[];
  visibleColumns?: string[];
}

export const RulesListTable = (props: RulesListTableProps) => {
  const {
    rulesListKey,
    rulesState,
    items = [],
    ruleTypesState,
    ruleTypeRegistry,
    isLoading = false,
    sort,
    isPageSelected = false,
    isAllSelected = false,
    numberOfSelectedRules = 0,
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
    onPercentileOptionsChange = EMPTY_HANDLER,
    onRuleChanged,
    onEnableRule = EMPTY_RESOLVE,
    onDisableRule = EMPTY_RESOLVE,
    onSnoozeRule = EMPTY_RESOLVE,
    onUnsnoozeRule = EMPTY_RESOLVE,
    onSelectAll = EMPTY_HANDLER,
    onSelectPage = EMPTY_HANDLER,
    onSelectRow = EMPTY_HANDLER,
    isRowSelected = () => false,
    renderCollapsedItemActions = EMPTY_RENDER,
    renderSelectAllDropdown,
    renderRuleError = EMPTY_RENDER,
    columns,
    visibleColumns,
  } = props;

  const [tagPopoverOpenIndex, setTagPopoverOpenIndex] = useState<number>(-1);
  const [currentlyOpenNotify, setCurrentlyOpenNotify] = useState<string>();
  const [isLoadingMap, setIsLoadingMap] = useState<Record<string, boolean>>({});

  const isRuleUsingExecutionStatus = getIsExperimentalFeatureEnabled('ruleUseExecutionStatus');

  const [defaultNumberFormat] = useUiSetting$<string>(DEFAULT_NUMBER_FORMAT);
  const { euiTheme } = useEuiTheme();

  const selectedPercentile = useMemo(() => {
    const selectedOption = percentileOptions.find((option) => option.checked === 'on');
    if (selectedOption) {
      return Percentiles[selectedOption.key as Percentiles];
    }
  }, [percentileOptions]);

  const onLoading = useCallback((id: string, newIsLoading: boolean) => {
    setIsLoadingMap((prevState) => ({
      ...prevState,
      [id]: newIsLoading,
    }));
  }, []);

  const ruleOutcomeColumnField = useMemo(() => {
    if (isRuleUsingExecutionStatus) {
      return 'executionStatus.status';
    }
    return 'lastRun.outcome';
  }, [isRuleUsingExecutionStatus]);

  // TODO: We can simply the column definitions by coming up with a
  // good context that can be passed into both the default and custom columns,
  // Then we don't need to define every column by hand and manually pass in props
  // and we don't need to re-compute this context on every prop change.
  const customColumnContext: RulesListColumnContext = useMemo(
    () => ({
      ...props,
      tagPopoverOpenIndex,
      currentlyOpenNotify,
      isLoadingMap,
      setTagPopoverOpenIndex,
      setCurrentlyOpenNotify,
      setIsLoadingMap,
    }),
    [props, tagPopoverOpenIndex, currentlyOpenNotify, isLoadingMap]
  );

  const customColumnMap = useMemo(() => {
    if (!columns || columns.length === 0) {
      return {};
    }
    return columns.reduce<Record<string, CustomRulesListColumn>>((result, column) => {
      if (originalRulesListVisibleColumns.includes(column.id)) {
        result[column.id] = column;
      }
      return result;
    }, {});
  }, [columns]);

  /**
   * Start of column definitions:
   */
  const selectionColumn = useMemo(() => {
    return {
      id: 'ruleSelection',
      field: 'selection',
      sortable: false,
      width: '32px',
      mobileOptions: { header: false },
      name: (
        <EuiCheckbox
          id="rulesListTable_selectAll"
          checked={isPageSelected}
          onChange={onSelectPage}
          data-test-subj="checkboxSelectAll"
        />
      ),
      render: (name: string, rule: RuleTableItem) => {
        return (
          <EuiCheckbox
            id={`ruleListTable_select_${rule.id}}`}
            onChange={() => onSelectRow(rule)}
            disabled={!rule.isEditable}
            checked={isRowSelected(rule)}
            data-test-subj={`checkboxSelectRow-${rule.id}`}
          />
        );
      },
    };
  }, [isPageSelected, onSelectPage, onSelectRow, isRowSelected]);

  const nameColumn = useMemo(() => {
    if (customColumnMap.ruleName) {
      return getCustomColumn(customColumnMap.ruleName, customColumnContext);
    }
    return getNameColumn({
      ruleTypesState,
      onRuleClick,
    });
  }, [ruleTypesState, customColumnMap, customColumnContext, onRuleClick]);

  const tagsColumn = useMemo(() => {
    if (customColumnMap.ruleTags) {
      return getCustomColumn(customColumnMap.ruleTags, customColumnContext);
    }
    return getTagsColumn({
      tagPopoverOpenIndex,
      setTagPopoverOpenIndex,
    });
  }, [tagPopoverOpenIndex, customColumnMap, customColumnContext, setTagPopoverOpenIndex]);

  const lastExecutionDateColumn = useMemo(() => {
    if (customColumnMap.ruleExecutionStatusLastDate) {
      return getCustomColumn(customColumnMap.ruleExecutionStatusLastDate, customColumnContext);
    }
    return getLastExecutionDateColumn();
  }, [customColumnMap, customColumnContext]);

  const snoozeNotifyColumn = useMemo(() => {
    if (customColumnMap.ruleSnoozeNotify) {
      return getCustomColumn(customColumnMap.ruleSnoozeNotify, customColumnContext);
    }
    return getSnoozeNotifyColumn({
      isLoadingMap,
      currentlyOpenNotify,
      setCurrentlyOpenNotify,
      onLoading,
      onRuleChanged,
      onSnoozeRule,
      onUnsnoozeRule,
    });
  }, [
    isLoadingMap,
    currentlyOpenNotify,
    customColumnMap,
    customColumnContext,
    setCurrentlyOpenNotify,
    onLoading,
    onRuleChanged,
    onSnoozeRule,
    onUnsnoozeRule,
  ]);

  const scheduleIntervalColumn = useMemo(() => {
    if (customColumnMap.ruleScheduleInterval) {
      return getCustomColumn(customColumnMap.ruleScheduleInterval, customColumnContext);
    }
    return getScheduleIntervalColumn({
      config,
      onRuleEditClick,
    });
  }, [config, customColumnMap, customColumnContext, onRuleEditClick]);

  const lastDurationColumn = useMemo(() => {
    if (customColumnMap.ruleExecutionStatusLastDuration) {
      return getCustomColumn(customColumnMap.ruleExecutionStatusLastDuration, customColumnContext);
    }
    return getLastDurationColumn({ ruleTypesState });
  }, [ruleTypesState, customColumnMap, customColumnContext]);

  const executionPercentileColumn = useMemo(() => {
    if (customColumnMap.ruleExecutionPercentile) {
      return getCustomColumn(customColumnMap.ruleExecutionPercentile, customColumnContext);
    }
    return getExecutionPercentileColumn({
      percentileOptions,
      selectedPercentile: selectedPercentile!,
      onPercentileOptionsChange,
    });
  }, [
    percentileOptions,
    selectedPercentile,
    customColumnMap,
    customColumnContext,
    onPercentileOptionsChange,
  ]);

  const executionSuccessRatioColumn = useMemo(() => {
    if (customColumnMap.ruleExecutionSuccessRatio) {
      return getCustomColumn(customColumnMap.ruleExecutionSuccessRatio, customColumnContext);
    }
    return getExecutionSuccessRatioColumn();
  }, [customColumnMap, customColumnContext]);

  const ruleLastResponseColumn = useMemo(() => {
    if (customColumnMap.ruleExecutionStatus) {
      return getCustomColumn(customColumnMap.ruleExecutionStatus, customColumnContext);
    }
    return getRuleLastResponseColumn({
      ruleOutcomeColumnField,
      onManageLicenseClick,
    });
  }, [ruleOutcomeColumnField, customColumnMap, customColumnContext, onManageLicenseClick]);

  const ruleStateColumn = useMemo(() => {
    if (customColumnMap.ruleExecutionState) {
      return getCustomColumn(customColumnMap.ruleExecutionState, customColumnContext);
    }
    return getRuleStateColumn({
      ruleTypeRegistry,
      onDisableRule,
      onEnableRule,
      onRuleChanged,
    });
  }, [
    ruleTypeRegistry,
    customColumnMap,
    customColumnContext,
    onDisableRule,
    onEnableRule,
    onRuleChanged,
  ]);

  const ruleActionsColumn = useMemo(() => {
    return getRuleActionsColumn({
      ruleTypeRegistry,
      onRuleEditClick,
      onRuleDeleteClick,
      onLoading,
      renderCollapsedItemActions,
    });
  }, [ruleTypeRegistry, onRuleEditClick, onRuleDeleteClick, onLoading, renderCollapsedItemActions]);

  const ruleErrorColumn = useMemo(() => {
    return getRuleErrorColumn({ renderRuleError });
  }, [renderRuleError]);

  /**
   * End of column definitions
   */
  const allRuleColumns: RulesListColumn[] = useMemo(() => {
    return [
      nameColumn,
      tagsColumn,
      lastExecutionDateColumn,
      snoozeNotifyColumn,
      scheduleIntervalColumn,
      lastDurationColumn,
      executionPercentileColumn,
      executionSuccessRatioColumn,
      ruleLastResponseColumn,
      ruleStateColumn,
      ruleActionsColumn,
      ruleErrorColumn,
    ] as RulesListColumn[];
  }, [
    nameColumn,
    tagsColumn,
    lastExecutionDateColumn,
    snoozeNotifyColumn,
    scheduleIntervalColumn,
    lastDurationColumn,
    executionPercentileColumn,
    executionSuccessRatioColumn,
    ruleLastResponseColumn,
    ruleStateColumn,
    ruleActionsColumn,
    ruleErrorColumn,
  ]);

  const [rulesListColumns, ColumnSelector] = useRulesListColumnSelector({
    allRuleColumns,
    rulesListKey,
    visibleColumns,
  });

  const formattedTotalRules = useMemo(() => {
    return numeral(rulesState.totalItemCount).format(defaultNumberFormat);
  }, [rulesState.totalItemCount, defaultNumberFormat]);

  const selectAllButtonText = useMemo(() => {
    if (isAllSelected) {
      return CLEAR_SELECTION;
    }
    return SELECT_ALL_RULES(formattedTotalRules, rulesState.totalItemCount);
  }, [isAllSelected, formattedTotalRules, rulesState.totalItemCount]);

  const rowProps = useCallback(
    (rule: RuleTableItem) => {
      const selectedClass = isRowSelected(rule) ? 'euiTableRow-isSelected' : '';
      return {
        'data-test-subj': 'rule-row',
        className: !ruleTypesState.data.get(rule.ruleTypeId)?.enabledInLicense
          ? `actRulesList__tableRowDisabled ${selectedClass}`
          : selectedClass,
      };
    },
    [ruleTypesState, isRowSelected]
  );

  const authorizedToModifyAllRules = useMemo(() => {
    let authorized = true;
    ruleTypesState.data.forEach((ruleType) => {
      if (!authorized) {
        return;
      }
      const allConsumersAuthorized = Object.values(ruleType.authorizedConsumers).every(
        (authorizedConsumer) => authorizedConsumer.all
      );
      if (!allConsumersAuthorized) {
        authorized = false;
      }
    });
    return authorized;
  }, [ruleTypesState]);

  return (
    <EuiFlexGroup gutterSize="none" direction="column">
      <EuiFlexGroup gutterSize="none" alignItems="center">
        <EuiFlexItem grow={false}>{ColumnSelector}</EuiFlexItem>
        <EuiFlexItem grow={false}>
          {numberOfSelectedRules > 0 ? (
            renderSelectAllDropdown?.()
          ) : (
            <EuiText
              size="xs"
              style={{ fontWeight: euiTheme.font.weight.semiBold }}
              data-test-subj="totalRulesCount"
            >
              {TOTAL_RULES(formattedTotalRules, rulesState.totalItemCount)}
            </EuiText>
          )}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          {numberOfSelectedRules > 0 && authorizedToModifyAllRules && (
            <EuiButtonEmpty
              size="xs"
              aria-label={SELECT_ALL_ARIA_LABEL}
              data-test-subj="selectAllRulesButton"
              iconType={isAllSelected ? 'cross' : 'pagesSelect'}
              onClick={onSelectAll}
            >
              {selectAllButtonText}
            </EuiButtonEmpty>
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiFlexItem>
        <EuiBasicTable
          loading={isLoading}
          /* Don't display rules until we have the rule types initialized */
          items={items}
          itemId="id"
          columns={[selectionColumn, ...rulesListColumns]}
          sorting={{ sort }}
          rowProps={rowProps}
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
            totalItemCount: ruleTypesState.initialLoad ? 0 : rulesState.totalItemCount,
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
