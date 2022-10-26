/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable react-hooks/exhaustive-deps */

import { i18n } from '@kbn/i18n';
import moment from 'moment';
import { capitalize, isEmpty, sortBy } from 'lodash';
import { KueryNode } from '@kbn/es-query';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useEffect, useState, ReactNode, useCallback, useMemo } from 'react';
import {
  EuiButton,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFilterGroup,
  EuiSpacer,
  EuiLink,
  EuiEmptyPrompt,
  EuiHealth,
  EuiTableSortingType,
  EuiButtonIcon,
  EuiSelectableOption,
  EuiIcon,
  EuiDescriptionList,
  EuiCallOut,
} from '@elastic/eui';
import { EuiSelectableOptionCheckedType } from '@elastic/eui/src/components/selectable/selectable_option';
import { useHistory } from 'react-router-dom';

import {
  RuleExecutionStatus,
  ALERTS_FEATURE_ID,
  RuleExecutionStatusErrorReasons,
} from '@kbn/alerting-plugin/common';
import { AlertingConnectorFeatureId } from '@kbn/actions-plugin/common';
import {
  ActionType,
  Rule,
  RuleTableItem,
  RuleType,
  RuleTypeIndex,
  RuleStatus,
  Pagination,
  Percentiles,
  TriggersActionsUiConfig,
  SnoozeSchedule,
} from '../../../../types';
import { RuleAdd, RuleEdit } from '../../rule_form';
import { BulkOperationPopover } from '../../common/components/bulk_operation_popover';
import { RuleQuickEditButtonsWithApi as RuleQuickEditButtons } from '../../common/components/rule_quick_edit_buttons';
import { CollapsedItemActionsWithApi as CollapsedItemActions } from './collapsed_item_actions';
import { TypeFilter } from './type_filter';
import { ActionTypeFilter } from './action_type_filter';
import { RuleExecutionStatusFilter } from './rule_execution_status_filter';
import {
  loadRuleTypes,
  disableRule,
  enableRule,
  snoozeRule,
  unsnoozeRule,
  bulkUpdateAPIKey,
} from '../../../lib/rule_api';
import { loadActionTypes } from '../../../lib/action_connector_api';
import { hasAllPrivilege, hasExecuteActionsCapability } from '../../../lib/capabilities';
import { routeToRuleDetails, DEFAULT_SEARCH_PAGE_SIZE } from '../../../constants';
import { RulesDeleteModalConfirmation } from '../../../components/rules_delete_modal_confirmation';
import { EmptyPrompt } from '../../../components/prompts/empty_prompt';
import { ALERT_STATUS_LICENSE_ERROR } from '../translations';
import { useKibana } from '../../../../common/lib/kibana';
import './rules_list.scss';
import { CenterJustifiedSpinner } from '../../../components/center_justified_spinner';
import { ManageLicenseModal } from './manage_license_modal';
import { triggersActionsUiConfig } from '../../../../common/lib/config_api';
import { RuleTagFilter } from './rule_tag_filter';
import { RuleStatusFilter } from './rule_status_filter';
import { getIsExperimentalFeatureEnabled } from '../../../../common/get_experimental_features';
import { useLoadRules } from '../../../hooks/use_load_rules';
import { useLoadTags } from '../../../hooks/use_load_tags';
import { useLoadRuleAggregations } from '../../../hooks/use_load_rule_aggregations';
import { RulesListTable, convertRulesToTableItems } from './rules_list_table';
import { RulesListAutoRefresh } from './rules_list_auto_refresh';
import { UpdateApiKeyModalConfirmation } from '../../../components/update_api_key_modal_confirmation';
import { RulesListVisibleColumns } from './rules_list_column_selector';
import { BulkSnoozeModalWithApi as BulkSnoozeModal } from './bulk_snooze_modal';
import { BulkSnoozeScheduleModalWithApi as BulkSnoozeScheduleModal } from './bulk_snooze_schedule_modal';
import { useBulkEditSelect } from '../../../hooks/use_bulk_edit_select';
import { runRule } from '../../../lib/run_rule';

const ENTER_KEY = 13;

interface RulesPageContainerState {
  lastResponse: string[];
  status: RuleStatus[];
}

export interface RulesListProps {
  filteredRuleTypes?: string[];
  showActionFilter?: boolean;
  ruleDetailsRoute?: string;
  showCreateRuleButton?: boolean;
  statusFilter?: RuleStatus[];
  onStatusFilterChange?: (status: RuleStatus[]) => RulesPageContainerState;
  lastResponseFilter?: string[];
  onLastResponseFilterChange?: (lastResponse: string[]) => RulesPageContainerState;
  refresh?: Date;
  rulesListKey?: string;
  visibleColumns?: RulesListVisibleColumns[];
}

interface RuleTypeState {
  isLoading: boolean;
  isInitialized: boolean;
  data: RuleTypeIndex;
}

export const percentileFields = {
  [Percentiles.P50]: 'monitoring.execution.calculated_metrics.p50',
  [Percentiles.P95]: 'monitoring.execution.calculated_metrics.p95',
  [Percentiles.P99]: 'monitoring.execution.calculated_metrics.p99',
};

const initialPercentileOptions = Object.values(Percentiles).map((percentile) => ({
  checked: percentile === Percentiles.P50 ? 'on' : (undefined as EuiSelectableOptionCheckedType),
  label: percentile,
  key: percentile,
}));

export const RulesList = ({
  filteredRuleTypes = [],
  showActionFilter = true,
  ruleDetailsRoute,
  showCreateRuleButton = true,
  statusFilter,
  onStatusFilterChange,
  lastResponseFilter,
  onLastResponseFilterChange,
  refresh,
  rulesListKey,
  visibleColumns,
}: RulesListProps) => {
  const history = useHistory();
  const {
    http,
    notifications: { toasts },
    application: { capabilities },
    ruleTypeRegistry,
    actionTypeRegistry,
    kibanaFeatures,
  } = useKibana().services;
  const canExecuteActions = hasExecuteActionsCapability(capabilities);

  const [config, setConfig] = useState<TriggersActionsUiConfig>({ isUsingSecurity: false });
  const [actionTypes, setActionTypes] = useState<ActionType[]>([]);
  const [isPerformingAction, setIsPerformingAction] = useState<boolean>(false);
  const [page, setPage] = useState<Pagination>({ index: 0, size: DEFAULT_SEARCH_PAGE_SIZE });
  const [searchText, setSearchText] = useState<string | undefined>();
  const [inputText, setInputText] = useState<string | undefined>();
  const [typesFilter, setTypesFilter] = useState<string[]>();
  const [actionTypesFilter, setActionTypesFilter] = useState<string[]>([]);
  const [ruleExecutionStatusesFilter, setRuleExecutionStatusesFilter] = useState<string[]>(
    lastResponseFilter || []
  );
  const [ruleStatusesFilter, setRuleStatusesFilter] = useState<RuleStatus[]>(statusFilter || []);

  const [tagsFilter, setTagsFilter] = useState<string[]>([]);
  const [ruleFlyoutVisible, setRuleFlyoutVisibility] = useState<boolean>(false);
  const [editFlyoutVisible, setEditFlyoutVisibility] = useState<boolean>(false);
  const [currentRuleToEdit, setCurrentRuleToEdit] = useState<RuleTableItem | null>(null);
  const [itemIdToExpandedRowMap, setItemIdToExpandedRowMap] = useState<Record<string, ReactNode>>(
    {}
  );
  const [showErrors, setShowErrors] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string>('');

  const isRuleTagFilterEnabled = getIsExperimentalFeatureEnabled('ruleTagFilter');
  const isRuleStatusFilterEnabled = getIsExperimentalFeatureEnabled('ruleStatusFilter');

  useEffect(() => {
    (async () => {
      setConfig(await triggersActionsUiConfig({ http }));
    })();
  }, [http]);

  const [percentileOptions, setPercentileOptions] =
    useState<EuiSelectableOption[]>(initialPercentileOptions);

  const [sort, setSort] = useState<EuiTableSortingType<RuleTableItem>['sort']>({
    field: 'name',
    direction: 'asc',
  });
  const [manageLicenseModalOpts, setManageLicenseModalOpts] = useState<{
    licenseType: string;
    ruleTypeId: string;
  } | null>(null);
  const [ruleTypesState, setRuleTypesState] = useState<RuleTypeState>({
    isLoading: false,
    isInitialized: false,
    data: new Map(),
  });

  const [rulesToDelete, setRulesToDelete] = useState<string[]>([]);
  const [rulesToDeleteFilter, setRulesToDeleteFilter] = useState<KueryNode | null | undefined>(); // do we need null and undefined?
  const [isDeletingRules, setIsDeletingRules] = useState<boolean>(false);

  // TODO - tech debt: Right now we're using null and undefined to determine if we should
  // render the bulk edit modal. Refactor this to only keep track of 1 set of rules and types
  // to determine which modal to show
  const [rulesToSnooze, setRulesToSnooze] = useState<RuleTableItem[]>([]);
  const [rulesToSnoozeFilter, setRulesToSnoozeFilter] = useState<KueryNode | null | undefined>();

  const [rulesToUnsnooze, setRulesToUnsnooze] = useState<RuleTableItem[]>([]);
  const [rulesToUnsnoozeFilter, setRulesToUnsnoozeFilter] = useState<
    KueryNode | null | undefined
  >();

  const [rulesToSchedule, setRulesToSchedule] = useState<RuleTableItem[]>([]);
  const [rulesToScheduleFilter, setRulesToScheduleFilter] = useState<
    KueryNode | null | undefined
  >();

  const [rulesToUnschedule, setRulesToUnschedule] = useState<RuleTableItem[]>([]);
  const [rulesToUnscheduleFilter, setRulesToUnscheduleFilter] = useState<
    KueryNode | null | undefined
  >();

  const [rulesToUpdateAPIKey, setRulesToUpdateAPIKey] = useState<string[]>([]);
  const [rulesToUpdateAPIKeyFilter, setRulesToUpdateAPIKeyFilter] = useState<
    KueryNode | null | undefined
  >();

  const [isSnoozingRules, setIsSnoozingRules] = useState<boolean>(false);
  const [isSchedulingRules, setIsSchedulingRules] = useState<boolean>(false);
  const [isUnsnoozingRules, setIsUnsnoozingRules] = useState<boolean>(false);
  const [isUnschedulingRules, setIsUnschedulingRules] = useState<boolean>(false);
  const [isUpdatingRuleAPIKeys, setIsUpdatingRuleAPIKeys] = useState<boolean>(false);

  const hasAnyAuthorizedRuleType = useMemo(() => {
    return ruleTypesState.isInitialized && ruleTypesState.data.size > 0;
  }, [ruleTypesState]);

  const onError = useCallback(
    (message: string) => {
      toasts.addDanger(message);
    },
    [toasts]
  );

  const authorizedRuleTypes = useMemo(() => [...ruleTypesState.data.values()], [ruleTypesState]);
  const authorizedToCreateAnyRules = authorizedRuleTypes.some(
    (ruleType) => ruleType.authorizedConsumers[ALERTS_FEATURE_ID]?.all
  );

  const [rulesTypesFilter, hasDefaultRuleTypesFiltersOn] = useMemo(() => {
    if (isEmpty(typesFilter) && !isEmpty(filteredRuleTypes)) {
      return [authorizedRuleTypes.map((art) => art.id), true];
    }
    return [typesFilter, false];
  }, [typesFilter, filteredRuleTypes, authorizedRuleTypes]);

  const { rulesState, setRulesState, loadRules, noData, initialLoad } = useLoadRules({
    page,
    searchText,
    typesFilter: rulesTypesFilter,
    actionTypesFilter,
    ruleExecutionStatusesFilter,
    ruleStatusesFilter,
    tagsFilter,
    sort,
    onPage: setPage,
    onError,
    hasDefaultRuleTypesFiltersOn,
  });

  const { tags, loadTags } = useLoadTags({
    onError,
  });

  const { loadRuleAggregations, rulesStatusesTotal } = useLoadRuleAggregations({
    searchText,
    typesFilter,
    actionTypesFilter,
    ruleExecutionStatusesFilter,
    ruleStatusesFilter,
    tagsFilter,
    onError,
  });

  const onRuleEdit = (ruleItem: RuleTableItem) => {
    setEditFlyoutVisibility(true);
    setCurrentRuleToEdit(ruleItem);
  };

  const onRunRule = async (id: string) => {
    await runRule(http, toasts, id);
  };

  const isRuleTypeEditableInContext = (ruleTypeId: string) =>
    ruleTypeRegistry.has(ruleTypeId) ? !ruleTypeRegistry.get(ruleTypeId).requiresAppContext : false;

  const refreshRules = useCallback(async () => {
    if (!ruleTypesState || !hasAnyAuthorizedRuleType) {
      return;
    }
    await loadRules();
    await loadRuleAggregations();
    if (isRuleStatusFilterEnabled) {
      await loadTags();
    }
    setLastUpdate(moment().format());
  }, [
    loadRules,
    loadTags,
    loadRuleAggregations,
    setLastUpdate,
    isRuleStatusFilterEnabled,
    hasAnyAuthorizedRuleType,
    ruleTypesState,
  ]);

  useEffect(() => {
    refreshRules();
  }, [refreshRules, refresh]);

  useEffect(() => {
    refreshRules();
  }, [refreshRules, percentileOptions]);

  useEffect(() => {
    (async () => {
      try {
        setRuleTypesState({ ...ruleTypesState, isLoading: true });
        const ruleTypes = await loadRuleTypes({ http });
        const index: RuleTypeIndex = new Map();
        for (const ruleType of ruleTypes) {
          index.set(ruleType.id, ruleType);
        }
        let filteredIndex = index;
        if (filteredRuleTypes && filteredRuleTypes.length > 0) {
          filteredIndex = new Map(
            [...index].filter(([k, v]) => {
              return filteredRuleTypes.includes(v.id);
            })
          );
        }
        setRuleTypesState({ isLoading: false, data: filteredIndex, isInitialized: true });
      } catch (e) {
        toasts.addDanger({
          title: i18n.translate(
            'xpack.triggersActionsUI.sections.rulesList.unableToLoadRuleTypesMessage',
            { defaultMessage: 'Unable to load rule types' }
          ),
        });
        setRuleTypesState({ ...ruleTypesState, isLoading: false });
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const result = await loadActionTypes({ http, featureId: AlertingConnectorFeatureId });
        const sortedResult = result
          .filter(({ id }) => actionTypeRegistry.has(id))
          .sort((a, b) => a.name.localeCompare(b.name));
        setActionTypes(sortedResult);
      } catch (e) {
        toasts.addDanger({
          title: i18n.translate(
            'xpack.triggersActionsUI.sections.rulesList.unableToLoadConnectorTypesMessage',
            { defaultMessage: 'Unable to load connector types' }
          ),
        });
      }
    })();
  }, []);

  useEffect(() => {
    if (onStatusFilterChange) {
      onStatusFilterChange(ruleStatusesFilter);
    }
  }, [ruleStatusesFilter]);

  useEffect(() => {
    if (statusFilter) {
      setRuleStatusesFilter(statusFilter);
    }
  }, [statusFilter]);

  useEffect(() => {
    if (lastResponseFilter) {
      setRuleExecutionStatusesFilter(lastResponseFilter);
    }
  }, [lastResponseFilter]);

  useEffect(() => {
    if (onLastResponseFilterChange) {
      onLastResponseFilterChange(ruleExecutionStatusesFilter);
    }
  }, [ruleExecutionStatusesFilter]);

  // Clear bulk selection anytime the filters change
  useEffect(() => {
    onClearSelection();
  }, [
    searchText,
    rulesTypesFilter,
    actionTypesFilter,
    ruleExecutionStatusesFilter,
    ruleStatusesFilter,
    tagsFilter,
    hasDefaultRuleTypesFiltersOn,
  ]);

  const buildErrorListItems = (_executionStatus: RuleExecutionStatus) => {
    const hasErrorMessage = _executionStatus.status === 'error';
    const errorMessage = _executionStatus?.error?.message;
    const isLicenseError =
      _executionStatus.error?.reason === RuleExecutionStatusErrorReasons.License;
    const statusMessage = isLicenseError ? ALERT_STATUS_LICENSE_ERROR : null;

    return [
      {
        title: (
          <FormattedMessage
            id="xpack.triggersActionsUI.sections.rulesList.expandRow.title"
            defaultMessage="Error from last run"
          />
        ),
        description: (
          <>
            {errorMessage}
            {hasErrorMessage && statusMessage && <EuiSpacer size="xs" />}
            {statusMessage}
          </>
        ),
      },
    ];
  };

  const toggleErrorMessage = (_executionStatus: RuleExecutionStatus, ruleItem: RuleTableItem) => {
    setItemIdToExpandedRowMap((itemToExpand) => {
      const _itemToExpand = { ...itemToExpand };
      if (_itemToExpand[ruleItem.id]) {
        delete _itemToExpand[ruleItem.id];
      } else {
        _itemToExpand[ruleItem.id] = (
          <EuiDescriptionList listItems={buildErrorListItems(_executionStatus)} />
        );
      }
      return _itemToExpand;
    });
  };

  const toggleRuleErrors = useCallback(() => {
    setShowErrors((prevValue) => {
      if (!prevValue) {
        const rulesToExpand = rulesState.data.reduce((acc, ruleItem) => {
          if (ruleItem.executionStatus.status === 'error') {
            return {
              ...acc,
              [ruleItem.id]: (
                <EuiDescriptionList listItems={buildErrorListItems(ruleItem.executionStatus)} />
              ),
            };
          }
          return acc;
        }, {});
        setItemIdToExpandedRowMap(rulesToExpand);
      } else {
        setItemIdToExpandedRowMap({});
      }
      return !prevValue;
    });
  }, [showErrors, rulesState]);

  const getProducerFeatureName = (producer: string) => {
    return kibanaFeatures?.find((featureItem) => featureItem.id === producer)?.name;
  };

  const groupRuleTypesByProducer = () => {
    return authorizedRuleTypes.reduce(
      (
        result: Record<
          string,
          Array<{
            value: string;
            name: string;
          }>
        >,
        ruleType
      ) => {
        const producer = ruleType.producer;
        (result[producer] = result[producer] || []).push({
          value: ruleType.id,
          name: ruleType.name,
        });
        return result;
      },
      {}
    );
  };

  const getRuleTagFilter = () => {
    if (isRuleTagFilterEnabled) {
      return [
        <RuleTagFilter isGrouped tags={tags} selectedTags={tagsFilter} onChange={setTagsFilter} />,
      ];
    }
    return [];
  };

  const renderRuleStatusFilter = () => {
    if (isRuleStatusFilterEnabled) {
      return (
        <RuleStatusFilter selectedStatuses={ruleStatusesFilter} onChange={setRuleStatusesFilter} />
      );
    }
    return null;
  };

  const onDisableRule = (rule: RuleTableItem) => {
    return disableRule({ http, id: rule.id });
  };

  const onEnableRule = (rule: RuleTableItem) => {
    return enableRule({ http, id: rule.id });
  };

  const onSnoozeRule = (rule: RuleTableItem, snoozeSchedule: SnoozeSchedule) => {
    return snoozeRule({ http, id: rule.id, snoozeSchedule });
  };

  const onUnsnoozeRule = (rule: RuleTableItem, scheduleIds?: string[]) => {
    return unsnoozeRule({ http, id: rule.id, scheduleIds });
  };

  const onSearchPopulate = (value: string) => {
    setInputText(value);
    setSearchText(value);
  };

  const filterOptions = sortBy(Object.entries(groupRuleTypesByProducer())).map(
    ([groupName, ruleTypesOptions]) => ({
      groupName: getProducerFeatureName(groupName) ?? capitalize(groupName),
      subOptions: ruleTypesOptions.sort((a, b) => a.name.localeCompare(b.name)),
    })
  );

  const toolsRight = [
    <TypeFilter
      key="type-filter"
      onChange={(types: string[]) => setTypesFilter(types)}
      options={filterOptions}
    />,
    showActionFilter && (
      <ActionTypeFilter
        key="action-type-filter"
        actionTypes={actionTypes}
        onChange={(ids: string[]) => setActionTypesFilter(ids)}
      />
    ),
    <RuleExecutionStatusFilter
      key="rule-status-filter"
      selectedStatuses={ruleExecutionStatusesFilter}
      onChange={setRuleExecutionStatusesFilter}
    />,
    ...getRuleTagFilter(),
  ];

  const tableItems = useMemo(() => {
    if (ruleTypesState.isInitialized === false) {
      return [];
    }
    return convertRulesToTableItems({
      rules: rulesState.data,
      ruleTypeIndex: ruleTypesState.data,
      canExecuteActions,
      config,
    });
  }, [ruleTypesState, rulesState, canExecuteActions, config]);

  const {
    isAllSelected,
    selectedIds,
    isPageSelected,
    numberOfSelectedItems,
    isRowSelected,
    getFilter,
    onSelectRow,
    onSelectAll,
    onSelectPage,
    onClearSelection,
  } = useBulkEditSelect({
    totalItemCount: rulesState.totalItemCount,
    items: tableItems,
    searchText,
    typesFilter: rulesTypesFilter,
    actionTypesFilter,
    ruleExecutionStatusesFilter,
    ruleStatusesFilter,
    tagsFilter,
  });

  const authorizedToModifySelectedRules = useMemo(() => {
    if (isAllSelected) {
      return true;
    }
    const selectedIdsArray = [...selectedIds];
    return selectedIdsArray.length
      ? filterRulesById(rulesState.data, selectedIdsArray).every((selectedRule) =>
          hasAllPrivilege(selectedRule, ruleTypesState.data.get(selectedRule.ruleTypeId))
        )
      : false;
  }, [selectedIds, rulesState.data, ruleTypesState.data, isAllSelected]);

  const clearRulesToSnooze = () => {
    setRulesToSnooze([]);
    setRulesToSnoozeFilter(undefined);
  };

  const clearRulesToDelete = () => {
    setRulesToDelete([]);
    setRulesToDeleteFilter(undefined);
  };

  const clearRulesToUnsnooze = () => {
    setRulesToUnsnooze([]);
    setRulesToUnsnoozeFilter(undefined);
  };

  const clearRulesToSchedule = () => {
    setRulesToSchedule([]);
    setRulesToScheduleFilter(undefined);
  };

  const clearRulesToUnschedule = () => {
    setRulesToUnschedule([]);
    setRulesToUnscheduleFilter(undefined);
  };

  const clearRulesToUpdateAPIKey = () => {
    setRulesToUpdateAPIKey([]);
    setRulesToUpdateAPIKeyFilter(undefined);
  };

  const isRulesTableLoading = useMemo(() => {
    return (
      rulesState.isLoading ||
      ruleTypesState.isLoading ||
      isPerformingAction ||
      isDeletingRules ||
      isSnoozingRules ||
      isUnsnoozingRules ||
      isSchedulingRules ||
      isUnschedulingRules ||
      isUpdatingRuleAPIKeys
    );
  }, [
    rulesState,
    ruleTypesState,
    isPerformingAction,
    isDeletingRules,
    isSnoozingRules,
    isUnsnoozingRules,
    isSchedulingRules,
    isUnschedulingRules,
    isUpdatingRuleAPIKeys,
  ]);

  const table = (
    <>
      {rulesStatusesTotal.error > 0 ? (
        <>
          <EuiCallOut color="danger" size="s" data-test-subj="rulesErrorBanner">
            <p>
              <EuiIcon color="danger" type="alert" />
              &nbsp;
              <FormattedMessage
                id="xpack.triggersActionsUI.sections.rulesList.attentionBannerTitle"
                defaultMessage="Error found in {totalStatusesError, plural, one {# rule} other {# rules}}."
                values={{
                  totalStatusesError: rulesStatusesTotal.error,
                }}
              />
              &nbsp;
              <EuiLink color="primary" onClick={() => setRuleExecutionStatusesFilter(['error'])}>
                <FormattedMessage
                  id="xpack.triggersActionsUI.sections.rulesList.viewBannerButtonLabel"
                  defaultMessage="Show {totalStatusesError, plural, one {rule} other {rules}} with error"
                  values={{
                    totalStatusesError: rulesStatusesTotal.error,
                  }}
                />
              </EuiLink>
            </p>
          </EuiCallOut>
          <EuiSpacer size="s" />
        </>
      ) : null}
      <EuiFlexGroup gutterSize="s">
        {authorizedToCreateAnyRules && showCreateRuleButton ? (
          <EuiFlexItem grow={false}>
            <EuiButton
              key="create-rule"
              data-test-subj="createRuleButton"
              fill
              onClick={() => setRuleFlyoutVisibility(true)}
            >
              <FormattedMessage
                id="xpack.triggersActionsUI.sections.rulesList.addRuleButtonLabel"
                defaultMessage="Create rule"
              />
            </EuiButton>
          </EuiFlexItem>
        ) : null}
        <EuiFlexItem>
          <EuiFieldSearch
            fullWidth
            isClearable
            data-test-subj="ruleSearchField"
            value={inputText}
            onChange={(e) => {
              setInputText(e.target.value);
              if (e.target.value === '') {
                setSearchText(e.target.value);
              }
            }}
            onKeyUp={(e) => {
              if (e.keyCode === ENTER_KEY) {
                setSearchText(inputText);
              }
            }}
            placeholder={i18n.translate(
              'xpack.triggersActionsUI.sections.rulesList.searchPlaceholderTitle',
              { defaultMessage: 'Search' }
            )}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>{renderRuleStatusFilter()}</EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFilterGroup>
            {toolsRight.map((tool, index: number) => (
              <React.Fragment key={index}>{tool}</React.Fragment>
            ))}
          </EuiFilterGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            data-test-subj="refreshRulesButton"
            iconType="refresh"
            onClick={() => {
              onClearSelection();
              refreshRules();
            }}
            name="refresh"
            color="primary"
          >
            <FormattedMessage
              id="xpack.triggersActionsUI.sections.rulesList.refreshRulesButtonLabel"
              defaultMessage="Refresh"
            />
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
        <EuiFlexItem>
          <EuiFlexGroup alignItems="center" gutterSize="none">
            <EuiFlexItem grow={false}>
              <EuiHealth color="success" data-test-subj="totalActiveRulesCount">
                <FormattedMessage
                  id="xpack.triggersActionsUI.sections.rulesList.totalStatusesActiveDescription"
                  defaultMessage="Active: {totalStatusesActive}"
                  values={{
                    totalStatusesActive: rulesStatusesTotal.active,
                  }}
                />
              </EuiHealth>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiHealth color="danger" data-test-subj="totalErrorRulesCount">
                <FormattedMessage
                  id="xpack.triggersActionsUI.sections.rulesList.totalStatusesErrorDescription"
                  defaultMessage="Error: {totalStatusesError}"
                  values={{ totalStatusesError: rulesStatusesTotal.error }}
                />
              </EuiHealth>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiHealth color="warning" data-test-subj="totalWarningRulesCount">
                <FormattedMessage
                  id="xpack.triggersActionsUI.sections.rulesList.totalStatusesWarningDescription"
                  defaultMessage="Warning: {totalStatusesWarning}"
                  values={{
                    totalStatusesWarning: rulesStatusesTotal.warning,
                  }}
                />
              </EuiHealth>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiHealth color="primary" data-test-subj="totalOkRulesCount">
                <FormattedMessage
                  id="xpack.triggersActionsUI.sections.rulesList.totalStatusesOkDescription"
                  defaultMessage="Ok: {totalStatusesOk}"
                  values={{ totalStatusesOk: rulesStatusesTotal.ok }}
                />
              </EuiHealth>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiHealth color="accent" data-test-subj="totalPendingRulesCount">
                <FormattedMessage
                  id="xpack.triggersActionsUI.sections.rulesList.totalStatusesPendingDescription"
                  defaultMessage="Pending: {totalStatusesPending}"
                  values={{
                    totalStatusesPending: rulesStatusesTotal.pending,
                  }}
                />
              </EuiHealth>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiHealth color="subdued" data-test-subj="totalUnknownRulesCount">
                <FormattedMessage
                  id="xpack.triggersActionsUI.sections.rulesList.totalStatusesUnknownDescription"
                  defaultMessage="Unknown: {totalStatusesUnknown}"
                  values={{
                    totalStatusesUnknown: rulesStatusesTotal.unknown,
                  }}
                />
              </EuiHealth>
            </EuiFlexItem>
            <RulesListAutoRefresh lastUpdate={lastUpdate} onRefresh={refreshRules} />
          </EuiFlexGroup>
        </EuiFlexItem>
        {rulesStatusesTotal.error > 0 && (
          <EuiFlexItem grow={false}>
            <EuiLink data-test-subj="expandRulesError" color="primary" onClick={toggleRuleErrors}>
              {!showErrors && (
                <FormattedMessage
                  id="xpack.triggersActionsUI.sections.rulesList.showAllErrors"
                  defaultMessage="Show {totalStatusesError, plural, one {error} other {errors}}"
                  values={{
                    totalStatusesError: rulesStatusesTotal.error,
                  }}
                />
              )}
              {showErrors && (
                <FormattedMessage
                  id="xpack.triggersActionsUI.sections.rulesList.hideAllErrors"
                  defaultMessage="Hide {totalStatusesError, plural, one {error} other {errors}}"
                  values={{
                    totalStatusesError: rulesStatusesTotal.error,
                  }}
                />
              )}
            </EuiLink>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <RulesListTable
        items={tableItems}
        isLoading={isRulesTableLoading}
        rulesState={rulesState}
        ruleTypesState={ruleTypesState}
        ruleTypeRegistry={ruleTypeRegistry}
        isPageSelected={isPageSelected}
        isAllSelected={isAllSelected}
        numberOfSelectedRules={numberOfSelectedItems}
        sort={sort}
        page={page}
        percentileOptions={percentileOptions}
        itemIdToExpandedRowMap={itemIdToExpandedRowMap}
        onSort={setSort}
        onPage={setPage}
        onRuleChanged={() => refreshRules()}
        onRuleClick={(rule) => {
          const detailsRoute = ruleDetailsRoute ? ruleDetailsRoute : routeToRuleDetails;
          history.push(detailsRoute.replace(`:ruleId`, rule.id));
        }}
        onRuleEditClick={(rule) => {
          if (rule.isEditable && isRuleTypeEditableInContext(rule.ruleTypeId)) {
            onRuleEdit(rule);
          }
        }}
        onRuleDeleteClick={(rule) => setRulesToDelete([rule.id])}
        onManageLicenseClick={(rule) =>
          setManageLicenseModalOpts({
            licenseType: ruleTypesState.data.get(rule.ruleTypeId)?.minimumLicenseRequired!,
            ruleTypeId: rule.ruleTypeId,
          })
        }
        onPercentileOptionsChange={setPercentileOptions}
        onDisableRule={onDisableRule}
        onEnableRule={onEnableRule}
        onSnoozeRule={onSnoozeRule}
        onUnsnoozeRule={onUnsnoozeRule}
        onSelectAll={onSelectAll}
        onSelectPage={onSelectPage}
        onSelectRow={onSelectRow}
        isRowSelected={isRowSelected}
        renderCollapsedItemActions={(rule, onLoading) => (
          <CollapsedItemActions
            key={rule.id}
            item={rule}
            onLoading={onLoading}
            onRuleChanged={() => refreshRules()}
            setRulesToDelete={setRulesToDelete}
            onEditRule={() => onRuleEdit(rule)}
            onUpdateAPIKey={setRulesToUpdateAPIKey}
            onRunRule={() => onRunRule(rule.id)}
          />
        )}
        renderRuleError={(rule) => {
          const _executionStatus = rule.executionStatus;
          const hasErrorMessage = _executionStatus.status === 'error';
          const isLicenseError =
            _executionStatus.error?.reason === RuleExecutionStatusErrorReasons.License;

          return isLicenseError || hasErrorMessage ? (
            <EuiButtonIcon
              onClick={() => toggleErrorMessage(_executionStatus, rule)}
              aria-label={itemIdToExpandedRowMap[rule.id] ? 'Collapse' : 'Expand'}
              iconType={itemIdToExpandedRowMap[rule.id] ? 'arrowUp' : 'arrowDown'}
            />
          ) : null;
        }}
        renderSelectAllDropdown={() => {
          return (
            <BulkOperationPopover
              numberOfSelectedRules={numberOfSelectedItems}
              canModifySelectedRules={authorizedToModifySelectedRules}
            >
              <RuleQuickEditButtons
                selectedItems={convertRulesToTableItems({
                  rules: filterRulesById(rulesState.data, [...selectedIds]),
                  ruleTypeIndex: ruleTypesState.data,
                  canExecuteActions,
                  config,
                })}
                isAllSelected={isAllSelected}
                getFilter={getFilter}
                onPerformingAction={() => setIsPerformingAction(true)}
                onActionPerformed={() => {
                  refreshRules();
                  setIsPerformingAction(false);
                }}
                isDeletingRules={isDeletingRules}
                isSnoozingRules={isSnoozingRules}
                isUnsnoozingRules={isUnsnoozingRules}
                isSchedulingRules={isSchedulingRules}
                isUnschedulingRules={isUnschedulingRules}
                isUpdatingRuleAPIKeys={isUpdatingRuleAPIKeys}
                setRulesToDelete={setRulesToDelete}
                setRulesToDeleteFilter={setRulesToDeleteFilter}
                setRulesToUpdateAPIKey={setRulesToUpdateAPIKey}
                setRulesToSnooze={setRulesToSnooze}
                setRulesToUnsnooze={setRulesToUnsnooze}
                setRulesToSchedule={setRulesToSchedule}
                setRulesToUnschedule={setRulesToUnschedule}
                setRulesToSnoozeFilter={setRulesToSnoozeFilter}
                setRulesToUnsnoozeFilter={setRulesToUnsnoozeFilter}
                setRulesToScheduleFilter={setRulesToScheduleFilter}
                setRulesToUnscheduleFilter={setRulesToUnscheduleFilter}
                setRulesToUpdateAPIKeyFilter={setRulesToUpdateAPIKeyFilter}
              />
            </BulkOperationPopover>
          );
        }}
        rulesListKey={rulesListKey}
        config={config}
        visibleColumns={visibleColumns}
      />
      {manageLicenseModalOpts && (
        <ManageLicenseModal
          licenseType={manageLicenseModalOpts.licenseType}
          ruleTypeId={manageLicenseModalOpts.ruleTypeId}
          onConfirm={() => {
            window.open(`${http.basePath.get()}/app/management/stack/license_management`, '_blank');
            setManageLicenseModalOpts(null);
          }}
          onCancel={() => setManageLicenseModalOpts(null)}
        />
      )}
    </>
  );
  // if initial load, show spinner
  const getRulesList = () => {
    if (noData && !rulesState.isLoading && !ruleTypesState.isLoading) {
      return authorizedToCreateAnyRules ? (
        <EmptyPrompt
          showCreateRuleButton={showCreateRuleButton}
          onCTAClicked={() => setRuleFlyoutVisibility(true)}
        />
      ) : (
        noPermissionPrompt
      );
    }

    if (initialLoad) {
      return <CenterJustifiedSpinner />;
    }

    return table;
  };

  return (
    <section data-test-subj="rulesList">
      <RulesDeleteModalConfirmation
        onDeleted={async () => {
          clearRulesToDelete();
          onClearSelection();
          await refreshRules();
        }}
        onErrors={async () => {
          await refreshRules();
          clearRulesToDelete();
        }}
        onCancel={() => {
          clearRulesToDelete();
        }}
        numberOfSelectedItems={numberOfSelectedItems}
        idsToDelete={rulesToDelete}
        rulesToDeleteFilter={rulesToDeleteFilter}
        setIsLoadingState={setIsDeletingRules}
      />
      <BulkSnoozeModal
        rulesToSnooze={rulesToSnooze}
        rulesToUnsnooze={rulesToUnsnooze}
        rulesToSnoozeFilter={rulesToSnoozeFilter}
        rulesToUnsnoozeFilter={rulesToUnsnoozeFilter}
        numberOfSelectedRules={numberOfSelectedItems}
        setIsSnoozingRule={setIsSnoozingRules}
        setIsUnsnoozingRule={setIsUnsnoozingRules}
        onClose={() => {
          clearRulesToSnooze();
          clearRulesToUnsnooze();
        }}
        onSave={async () => {
          clearRulesToSnooze();
          clearRulesToUnsnooze();
          onClearSelection();
          await refreshRules();
        }}
        onSearchPopulate={onSearchPopulate}
      />
      <BulkSnoozeScheduleModal
        rulesToSchedule={rulesToSchedule}
        rulesToUnschedule={rulesToUnschedule}
        rulesToScheduleFilter={rulesToScheduleFilter}
        rulesToUnscheduleFilter={rulesToUnscheduleFilter}
        numberOfSelectedRules={numberOfSelectedItems}
        setIsSchedulingRule={setIsSchedulingRules}
        setIsUnschedulingRule={setIsUnschedulingRules}
        onClose={() => {
          clearRulesToSchedule();
          clearRulesToUnschedule();
        }}
        onSave={async () => {
          clearRulesToSchedule();
          clearRulesToUnschedule();
          onClearSelection();
          await refreshRules();
        }}
        onSearchPopulate={onSearchPopulate}
      />
      <UpdateApiKeyModalConfirmation
        onCancel={() => {
          clearRulesToUpdateAPIKey();
        }}
        idsToUpdate={rulesToUpdateAPIKey}
        idsToUpdateFilter={rulesToUpdateAPIKeyFilter}
        numberOfSelectedRules={numberOfSelectedItems}
        apiUpdateApiKeyCall={bulkUpdateAPIKey}
        setIsLoadingState={(isLoading: boolean) => {
          setIsUpdatingRuleAPIKeys(isLoading);
          setRulesState({ ...rulesState, isLoading });
        }}
        onUpdated={async () => {
          clearRulesToUpdateAPIKey();
          onClearSelection();
          await refreshRules();
        }}
        onSearchPopulate={onSearchPopulate}
      />
      <EuiSpacer size="xs" />
      {getRulesList()}
      {ruleFlyoutVisible && (
        <RuleAdd
          consumer={ALERTS_FEATURE_ID}
          onClose={() => {
            setRuleFlyoutVisibility(false);
          }}
          actionTypeRegistry={actionTypeRegistry}
          ruleTypeRegistry={ruleTypeRegistry}
          ruleTypeIndex={ruleTypesState.data}
          onSave={refreshRules}
        />
      )}
      {editFlyoutVisible && currentRuleToEdit && (
        <RuleEdit
          initialRule={currentRuleToEdit}
          onClose={() => {
            setEditFlyoutVisibility(false);
          }}
          actionTypeRegistry={actionTypeRegistry}
          ruleTypeRegistry={ruleTypeRegistry}
          ruleType={
            ruleTypesState.data.get(currentRuleToEdit.ruleTypeId) as RuleType<string, string>
          }
          onSave={refreshRules}
        />
      )}
    </section>
  );
};

// eslint-disable-next-line import/no-default-export
export { RulesList as default };

const noPermissionPrompt = (
  <EuiEmptyPrompt
    data-test-subj="noPermissionPrompt"
    iconType="securityApp"
    title={
      <h1>
        <FormattedMessage
          id="xpack.triggersActionsUI.sections.rulesList.noPermissionToCreateTitle"
          defaultMessage="No permissions to create rules"
        />
      </h1>
    }
    body={
      <p data-test-subj="permissionDeniedMessage">
        <FormattedMessage
          id="xpack.triggersActionsUI.sections.rulesList.noPermissionToCreateDescription"
          defaultMessage="Contact your system administrator."
        />
      </p>
    }
  />
);

function filterRulesById(rules: Rule[], ids: string[]): Rule[] {
  return rules.filter((rule) => ids.includes(rule.id));
}
