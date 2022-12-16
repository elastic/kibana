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
import React, {
  lazy,
  useEffect,
  useState,
  ReactNode,
  useCallback,
  useMemo,
  useRef,
  Suspense,
} from 'react';
import {
  EuiButton,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFilterGroup,
  EuiSpacer,
  EuiLink,
  EuiPageTemplate,
  EuiTableSortingType,
  EuiButtonIcon,
  EuiSelectableOption,
  EuiDescriptionList,
} from '@elastic/eui';
import { EuiSelectableOptionCheckedType } from '@elastic/eui/src/components/selectable/selectable_option';
import { useHistory } from 'react-router-dom';

import {
  RuleExecutionStatus,
  ALERTS_FEATURE_ID,
  RuleExecutionStatusErrorReasons,
  RuleLastRunOutcomeValues,
} from '@kbn/alerting-plugin/common';
import { AlertingConnectorFeatureId } from '@kbn/actions-plugin/common';
import { ruleDetailsRoute as commonRuleDetailsRoute } from '@kbn/rule-data-utils';
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
import { BulkOperationPopover } from '../../common/components/bulk_operation_popover';
import { RuleQuickEditButtonsWithApi as RuleQuickEditButtons } from '../../common/components/rule_quick_edit_buttons';
import { CollapsedItemActionsWithApi as CollapsedItemActions } from './collapsed_item_actions';
import { RulesListStatuses } from './rules_list_statuses';
import { TypeFilter } from './type_filter';
import { ActionTypeFilter } from './action_type_filter';
import { RuleExecutionStatusFilter } from './rule_execution_status_filter';
import { RuleLastRunOutcomeFilter } from './rule_last_run_outcome_filter';
import { RulesListErrorBanner } from './rules_list_error_banner';
import {
  loadRuleTypes,
  snoozeRule,
  unsnoozeRule,
  bulkUpdateAPIKey,
  bulkDisableRules,
  bulkEnableRules,
  cloneRule,
} from '../../../lib/rule_api';
import { loadActionTypes } from '../../../lib/action_connector_api';
import { hasAllPrivilege, hasExecuteActionsCapability } from '../../../lib/capabilities';
import { DEFAULT_SEARCH_PAGE_SIZE } from '../../../constants';
import { RulesDeleteModalConfirmation } from '../../../components/rules_delete_modal_confirmation';
import { RulesListPrompts } from './rules_list_prompts';
import { ALERT_STATUS_LICENSE_ERROR } from '../translations';
import { useKibana } from '../../../../common/lib/kibana';
import './rules_list.scss';
import { CreateRuleButton } from './create_rule_button';
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
import { RulesListDocLink } from './rules_list_doc_link';
import { UpdateApiKeyModalConfirmation } from '../../../components/update_api_key_modal_confirmation';
import { RulesListVisibleColumns } from './rules_list_column_selector';
import { BulkSnoozeModalWithApi as BulkSnoozeModal } from './bulk_snooze_modal';
import { BulkSnoozeScheduleModalWithApi as BulkSnoozeScheduleModal } from './bulk_snooze_schedule_modal';
import { useBulkEditSelect } from '../../../hooks/use_bulk_edit_select';
import { runRule } from '../../../lib/run_rule';
import { bulkDeleteRules } from '../../../lib/rule_api';
import {
  getConfirmDeletionButtonText,
  getConfirmDeletionModalText,
  SINGLE_RULE_TITLE,
  MULTIPLE_RULE_TITLE,
} from '../translations';
import { useBulkOperationToast } from '../../../hooks/use_bulk_operation_toast';

// Directly lazy import the flyouts because the suspendedComponentWithProps component
// cause a visual hitch due to the loading spinner
const RuleAdd = lazy(() => import('../../rule_form/rule_add'));
const RuleEdit = lazy(() => import('../../rule_form/rule_edit'));

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
  showCreateRuleButtonInPrompt?: boolean;
  setHeaderActions?: (components?: React.ReactNode[]) => void;
  statusFilter?: RuleStatus[];
  onStatusFilterChange?: (status: RuleStatus[]) => RulesPageContainerState;
  lastResponseFilter?: string[];
  onLastResponseFilterChange?: (lastResponse: string[]) => RulesPageContainerState;
  lastRunOutcomeFilter?: string[];
  onLastRunOutcomeFilterChange?: (lastRunOutcome: string[]) => RulesPageContainerState;
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
  [Percentiles.P50]: 'monitoring.run.calculated_metrics.p50',
  [Percentiles.P95]: 'monitoring.run.calculated_metrics.p95',
  [Percentiles.P99]: 'monitoring.run.calculated_metrics.p99',
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
  showCreateRuleButtonInPrompt = false,
  statusFilter,
  onStatusFilterChange,
  lastResponseFilter,
  onLastResponseFilterChange,
  lastRunOutcomeFilter,
  onLastRunOutcomeFilterChange,
  setHeaderActions,
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
  const [typesFilter, setTypesFilter] = useState<string[]>([]);
  const [actionTypesFilter, setActionTypesFilter] = useState<string[]>([]);
  const [ruleExecutionStatusesFilter, setRuleExecutionStatusesFilter] = useState<string[]>(
    lastResponseFilter || []
  );
  const [ruleLastRunOutcomesFilter, setRuleLastRunOutcomesFilter] = useState<string[]>(
    lastRunOutcomeFilter || []
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
  const isRuleUsingExecutionStatus = getIsExperimentalFeatureEnabled('ruleUseExecutionStatus');

  const cloneRuleId = useRef<null | string>(null);

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
  const [rulesToDeleteFilter, setRulesToDeleteFilter] = useState<KueryNode | null | undefined>();
  const [isDeletingRules, setIsDeletingRules] = useState<boolean>(false);
  const [isEnablingRules, setIsEnablingRules] = useState<boolean>(false);
  const [isDisablingRules, setIsDisablingRules] = useState<boolean>(false);

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
  const [isCloningRule, setIsCloningRule] = useState<boolean>(false);

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
    if (isEmpty(typesFilter)) {
      return [authorizedRuleTypes.map((art) => art.id), true];
    }
    return [typesFilter, false];
  }, [typesFilter, authorizedRuleTypes]);

  const { rulesState, setRulesState, loadRules, noData, initialLoad } = useLoadRules({
    page,
    searchText,
    typesFilter: rulesTypesFilter,
    actionTypesFilter,
    ruleExecutionStatusesFilter,
    ruleLastRunOutcomesFilter,
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

  const { loadRuleAggregations, rulesStatusesTotal, rulesLastRunOutcomesTotal } =
    useLoadRuleAggregations({
      searchText,
      typesFilter: rulesTypesFilter,
      actionTypesFilter,
      ruleExecutionStatusesFilter,
      ruleLastRunOutcomesFilter,
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
  }, [ruleTypesState, rulesState.data, canExecuteActions, config]);

  useEffect(() => {
    refreshRules();
  }, [refreshRules, refresh, percentileOptions]);

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
    if (lastRunOutcomeFilter) {
      setRuleLastRunOutcomesFilter(lastRunOutcomeFilter);
    }
  }, [lastResponseFilter]);

  useEffect(() => {
    if (onLastResponseFilterChange) {
      onLastResponseFilterChange(ruleExecutionStatusesFilter);
    }
  }, [ruleExecutionStatusesFilter]);

  useEffect(() => {
    if (onLastRunOutcomeFilterChange) {
      onLastRunOutcomeFilterChange(ruleLastRunOutcomesFilter);
    }
  }, [ruleLastRunOutcomesFilter]);

  // Clear bulk selection anytime the filters change
  useEffect(() => {
    onClearSelection();
  }, [
    searchText,
    rulesTypesFilter,
    actionTypesFilter,
    ruleExecutionStatusesFilter,
    ruleLastRunOutcomesFilter,
    ruleStatusesFilter,
    tagsFilter,
    hasDefaultRuleTypesFiltersOn,
  ]);

  useEffect(() => {
    if (cloneRuleId.current) {
      const ruleItem = tableItems.find((ti) => ti.id === cloneRuleId.current);
      cloneRuleId.current = null;
      setIsCloningRule(false);
      if (ruleItem) {
        onRuleEdit(ruleItem);
      }
    }
  }, [tableItems]);

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
          // Check both outcome and executionStatus for now until we deprecate executionStatus
          if (
            ruleItem.lastRun?.outcome === RuleLastRunOutcomeValues[2] ||
            ruleItem.executionStatus.status === 'error'
          ) {
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

  const getRuleOutcomeOrStatusFilter = () => {
    if (isRuleUsingExecutionStatus) {
      return [
        <RuleExecutionStatusFilter
          key="rule-status-filter"
          selectedStatuses={ruleExecutionStatusesFilter}
          onChange={setRuleExecutionStatusesFilter}
        />,
      ];
    }
    return [
      <RuleLastRunOutcomeFilter
        key="rule-last-run-outcome-filter"
        selectedOutcomes={ruleLastRunOutcomesFilter}
        onChange={setRuleLastRunOutcomesFilter}
      />,
    ];
  };

  const onDisableRule = useCallback(
    async (rule: RuleTableItem) => {
      await bulkDisableRules({ http, ids: [rule.id] });
    },
    [bulkDisableRules]
  );

  const onEnableRule = useCallback(
    async (rule: RuleTableItem) => {
      await bulkEnableRules({ http, ids: [rule.id] });
    },
    [bulkEnableRules]
  );

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
      onChange={setTypesFilter}
      options={filterOptions}
      filters={typesFilter}
    />,
    showActionFilter && (
      <ActionTypeFilter
        key="action-type-filter"
        actionTypes={actionTypes}
        onChange={setActionTypesFilter}
        filters={actionTypesFilter}
      />
    ),
    ...getRuleOutcomeOrStatusFilter(),
    ...getRuleTagFilter(),
  ];

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
    ruleLastRunOutcomesFilter,
    ruleStatusesFilter,
    tagsFilter,
  });

  const authorizedToModifySelectedRules = useMemo(() => {
    if (isAllSelected) {
      return true;
    }

    return selectedIds.length
      ? filterRulesById(rulesState.data, selectedIds).every((selectedRule) =>
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
      isEnablingRules ||
      isDisablingRules ||
      isUnsnoozingRules ||
      isSchedulingRules ||
      isUnschedulingRules ||
      isUpdatingRuleAPIKeys ||
      isCloningRule
    );
  }, [
    rulesState,
    ruleTypesState,
    isPerformingAction,
    isDeletingRules,
    isEnablingRules,
    isDisablingRules,
    isSnoozingRules,
    isUnsnoozingRules,
    isSchedulingRules,
    isUnschedulingRules,
    isUpdatingRuleAPIKeys,
    isCloningRule,
  ]);

  const onCloneRule = async (ruleId: string) => {
    setIsCloningRule(true);
    try {
      const RuleCloned = await cloneRule({ http, ruleId });
      cloneRuleId.current = RuleCloned.id;
      await loadRules();
    } catch {
      cloneRuleId.current = null;
      setIsCloningRule(false);
      toasts.addDanger(
        i18n.translate('xpack.triggersActionsUI.sections.rulesList.cloneFailed', {
          defaultMessage: 'Unable to clone rule',
        })
      );
    }
  };

  const openFlyout = useCallback(() => {
    setRuleFlyoutVisibility(true);
  }, []);

  const table = (
    <>
      <RulesListErrorBanner
        rulesLastRunOutcomes={rulesLastRunOutcomesTotal}
        setRuleExecutionStatusesFilter={setRuleExecutionStatusesFilter}
        setRuleLastRunOutcomesFilter={setRuleLastRunOutcomesFilter}
      />
      <EuiFlexGroup gutterSize="s">
        {authorizedToCreateAnyRules && showCreateRuleButton ? (
          <EuiFlexItem grow={false}>
            <CreateRuleButton openFlyout={openFlyout} />
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
            <RulesListStatuses
              rulesStatuses={rulesStatusesTotal}
              rulesLastRunOutcomes={rulesLastRunOutcomesTotal}
            />
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
          const detailsRoute = ruleDetailsRoute ? ruleDetailsRoute : commonRuleDetailsRoute;
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
            onCloneRule={onCloneRule}
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
                  rules: filterRulesById(rulesState.data, selectedIds),
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
                isEnablingRules={isEnablingRules}
                isDisablingRules={isDisablingRules}
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
                onEnable={onEnable}
                onDisable={onDisable}
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

  const showPrompt = noData && !rulesState.isLoading && !ruleTypesState.isLoading;

  useEffect(() => {
    if (initialLoad) {
      return;
    }
    if (showPrompt && !authorizedToCreateAnyRules) {
      setHeaderActions?.([<RulesListDocLink />]);
      return;
    }
    if (!showPrompt && authorizedToCreateAnyRules) {
      setHeaderActions?.([<CreateRuleButton openFlyout={openFlyout} />, <RulesListDocLink />]);
      return;
    }
    setHeaderActions?.();
  }, [initialLoad, showPrompt, authorizedToCreateAnyRules]);

  useEffect(() => {
    return () => setHeaderActions?.();
  }, []);

  const renderTable = () => {
    if (!showPrompt && !initialLoad) {
      return table;
    }
    return null;
  };

  const [isDeleteModalFlyoutVisible, setIsDeleteModalVisibility] = useState<boolean>(false);

  useEffect(() => {
    setIsDeleteModalVisibility(rulesToDelete.length > 0 || Boolean(rulesToDeleteFilter));
  }, [rulesToDelete, rulesToDeleteFilter]);

  const { showToast } = useBulkOperationToast({ onSearchPopulate });

  const onEnable = useCallback(async () => {
    setIsEnablingRules(true);

    const { errors, total } = isAllSelected
      ? await bulkEnableRules({ http, filter: getFilter() })
      : await bulkEnableRules({ http, ids: selectedIds });

    setIsEnablingRules(false);
    showToast({ action: 'ENABLE', errors, total });
    await refreshRules();
    onClearSelection();
  }, [http, selectedIds, getFilter, setIsEnablingRules, showToast]);

  const onDisable = useCallback(async () => {
    setIsDisablingRules(true);

    const { errors, total } = isAllSelected
      ? await bulkDisableRules({ http, filter: getFilter() })
      : await bulkDisableRules({ http, ids: selectedIds });

    setIsDisablingRules(false);
    showToast({ action: 'DISABLE', errors, total });
    await refreshRules();
    onClearSelection();
  }, [http, selectedIds, getFilter, setIsDisablingRules, showToast]);

  const onDeleteCancel = () => {
    setIsDeleteModalVisibility(false);
    clearRulesToDelete();
  };
  const onDeleteConfirm = useCallback(async () => {
    setIsDeleteModalVisibility(false);
    setIsDeletingRules(true);

    const { errors, total } = await bulkDeleteRules({
      filter: rulesToDeleteFilter,
      ids: rulesToDelete,
      http,
    });

    setIsDeletingRules(false);
    showToast({ action: 'DELETE', errors, total });
    await refreshRules();
    clearRulesToDelete();
    onClearSelection();
  }, [http, rulesToDelete, rulesToDeleteFilter, setIsDeletingRules, toasts]);

  const numberRulesToDelete = rulesToDelete.length || numberOfSelectedItems;

  return (
    <>
      <RulesListPrompts
        showPrompt={showPrompt}
        showCreateRule={showCreateRuleButtonInPrompt}
        showSpinner={initialLoad}
        authorizedToCreateRules={authorizedToCreateAnyRules}
        onCreateRulesClick={openFlyout}
      />
      <EuiPageTemplate.Section data-test-subj="rulesList" grow={false} paddingSize="none">
        {isDeleteModalFlyoutVisible && (
          <RulesDeleteModalConfirmation
            onConfirm={onDeleteConfirm}
            onCancel={onDeleteCancel}
            confirmButtonText={getConfirmDeletionButtonText(
              numberRulesToDelete,
              SINGLE_RULE_TITLE,
              MULTIPLE_RULE_TITLE
            )}
            confirmModalText={getConfirmDeletionModalText(
              numberRulesToDelete,
              SINGLE_RULE_TITLE,
              MULTIPLE_RULE_TITLE
            )}
          />
        )}
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
        {renderTable()}
        {ruleFlyoutVisible && (
          <Suspense fallback={<div />}>
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
          </Suspense>
        )}
        {editFlyoutVisible && currentRuleToEdit && (
          <Suspense fallback={<div />}>
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
          </Suspense>
        )}
      </EuiPageTemplate.Section>
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export { RulesList as default };

function filterRulesById(rules: Rule[], ids: string[]): Rule[] {
  return rules.filter((rule) => ids.includes(rule.id));
}
