/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable react-hooks/exhaustive-deps */

import { i18n } from '@kbn/i18n';
import { capitalize, sortBy } from 'lodash';
import moment from 'moment';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useEffect, useState, useMemo, ReactNode, useCallback } from 'react';
import {
  EuiBasicTable,
  EuiButton,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiSpacer,
  EuiLink,
  EuiEmptyPrompt,
  EuiButtonEmpty,
  EuiHealth,
  EuiText,
  EuiToolTip,
  EuiTableSortingType,
  EuiButtonIcon,
  EuiHorizontalRule,
  EuiSelectableOption,
  EuiIcon,
  EuiScreenReaderOnly,
  RIGHT_ALIGNMENT,
  EuiDescriptionList,
  EuiTableFieldDataColumnType,
  EuiTableComputedColumnType,
  EuiTableActionsColumnType,
  EuiCallOut,
} from '@elastic/eui';
import { EuiSelectableOptionCheckedType } from '@elastic/eui/src/components/selectable/selectable_option';
import { useHistory } from 'react-router-dom';

import { isEmpty } from 'lodash';
import {
  RuleExecutionStatus,
  RuleExecutionStatusValues,
  ALERTS_FEATURE_ID,
  RuleExecutionStatusErrorReasons,
  formatDuration,
  parseDuration,
  MONITORING_HISTORY_LIMIT,
} from '@kbn/alerting-plugin/common';
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
} from '../../../../types';
import { RuleAdd, RuleEdit } from '../../rule_form';
import { BulkOperationPopover } from '../../common/components/bulk_operation_popover';
import { RuleQuickEditButtonsWithApi as RuleQuickEditButtons } from '../../common/components/rule_quick_edit_buttons';
import { CollapsedItemActionsWithApi as CollapsedItemActions } from './collapsed_item_actions';
import { TypeFilter } from './type_filter';
import { ActionTypeFilter } from './action_type_filter';
import { RuleExecutionStatusFilter, getHealthColor } from './rule_execution_status_filter';
import {
  loadRules,
  loadRuleAggregations,
  loadRuleTags,
  loadRuleTypes,
  disableRule,
  enableRule,
  snoozeRule,
  unsnoozeRule,
  deleteRules,
} from '../../../lib/rule_api';
import { loadActionTypes } from '../../../lib/action_connector_api';
import { hasAllPrivilege, hasExecuteActionsCapability } from '../../../lib/capabilities';
import { routeToRuleDetails, DEFAULT_SEARCH_PAGE_SIZE } from '../../../constants';
import { DeleteModalConfirmation } from '../../../components/delete_modal_confirmation';
import { EmptyPrompt } from '../../../components/prompts/empty_prompt';
import { rulesStatusesTranslationsMapping, ALERT_STATUS_LICENSE_ERROR } from '../translations';
import { useKibana } from '../../../../common/lib/kibana';
import { DEFAULT_HIDDEN_ACTION_TYPES } from '../../../../common/constants';
import './rules_list.scss';
import { CenterJustifiedSpinner } from '../../../components/center_justified_spinner';
import { ManageLicenseModal } from './manage_license_modal';
import { checkRuleTypeEnabled } from '../../../lib/check_rule_type_enabled';
import { RuleStatusDropdown } from './rule_status_dropdown';
import { RuleTagBadge } from './rule_tag_badge';
import { PercentileSelectablePopover } from './percentile_selectable_popover';
import { RuleDurationFormat } from './rule_duration_format';
import { shouldShowDurationWarning } from '../../../lib/execution_duration_utils';
import { getFormattedSuccessRatio } from '../../../lib/monitoring_utils';
import { triggersActionsUiConfig } from '../../../../common/lib/config_api';
import { RuleTagFilter } from './rule_tag_filter';
import { RuleStatusFilter } from './rule_status_filter';
import { getIsExperimentalFeatureEnabled } from '../../../../common/get_experimental_features';

const ENTER_KEY = 13;

interface RuleTypeState {
  isLoading: boolean;
  isInitialized: boolean;
  data: RuleTypeIndex;
}
interface RuleState {
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

const initialPercentileOptions = Object.values(Percentiles).map((percentile) => ({
  checked: percentile === Percentiles.P50 ? 'on' : (undefined as EuiSelectableOptionCheckedType),
  label: percentile,
  key: percentile,
}));

export const RulesList: React.FunctionComponent = () => {
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

  const [initialLoad, setInitialLoad] = useState<boolean>(true);
  const [noData, setNoData] = useState<boolean>(true);
  const [config, setConfig] = useState<TriggersActionsUiConfig>({});
  const [actionTypes, setActionTypes] = useState<ActionType[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isPerformingAction, setIsPerformingAction] = useState<boolean>(false);
  const [page, setPage] = useState<Pagination>({ index: 0, size: DEFAULT_SEARCH_PAGE_SIZE });
  const [searchText, setSearchText] = useState<string | undefined>();
  const [inputText, setInputText] = useState<string | undefined>();
  const [typesFilter, setTypesFilter] = useState<string[]>([]);
  const [actionTypesFilter, setActionTypesFilter] = useState<string[]>([]);
  const [ruleExecutionStatusesFilter, setRuleExecutionStatusesFilter] = useState<string[]>([]);
  const [ruleStatusesFilter, setRuleStatusesFilter] = useState<RuleStatus[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [tagsFilter, setTagsFilter] = useState<string[]>([]);
  const [ruleFlyoutVisible, setRuleFlyoutVisibility] = useState<boolean>(false);
  const [editFlyoutVisible, setEditFlyoutVisibility] = useState<boolean>(false);
  const [currentRuleToEdit, setCurrentRuleToEdit] = useState<RuleTableItem | null>(null);
  const [tagPopoverOpenIndex, setTagPopoverOpenIndex] = useState<number>(-1);
  const [itemIdToExpandedRowMap, setItemIdToExpandedRowMap] = useState<Record<string, ReactNode>>(
    {}
  );
  const [showErrors, setShowErrors] = useState(false);

  const isRuleTagFilterEnabled = getIsExperimentalFeatureEnabled('ruleTagFilter');
  const isRuleStatusFilterEnabled = getIsExperimentalFeatureEnabled('ruleStatusFilter');

  useEffect(() => {
    (async () => {
      setConfig(await triggersActionsUiConfig({ http }));
    })();
  }, [http]);

  const [percentileOptions, setPercentileOptions] =
    useState<EuiSelectableOption[]>(initialPercentileOptions);

  const selectedPercentile = useMemo(() => {
    const selectedOption = percentileOptions.find((option) => option.checked === 'on');
    if (selectedOption) {
      return Percentiles[selectedOption.key as Percentiles];
    }
  }, [percentileOptions]);

  const [sort, setSort] = useState<EuiTableSortingType<RuleTableItem>['sort']>({
    field: 'name',
    direction: 'asc',
  });
  const [manageLicenseModalOpts, setManageLicenseModalOpts] = useState<{
    licenseType: string;
    ruleTypeId: string;
  } | null>(null);
  const [rulesStatusesTotal, setRulesStatusesTotal] = useState<Record<string, number>>(
    RuleExecutionStatusValues.reduce(
      (prev: Record<string, number>, status: string) =>
        ({
          ...prev,
          [status]: 0,
        } as Record<string, number>),
      {}
    )
  );
  const [ruleTypesState, setRuleTypesState] = useState<RuleTypeState>({
    isLoading: false,
    isInitialized: false,
    data: new Map(),
  });
  const [rulesState, setRulesState] = useState<RuleState>({
    isLoading: false,
    data: [],
    totalItemCount: 0,
  });
  const [rulesToDelete, setRulesToDelete] = useState<string[]>([]);
  const onRuleEdit = (ruleItem: RuleTableItem) => {
    setEditFlyoutVisibility(true);
    setCurrentRuleToEdit(ruleItem);
  };

  const isRuleTypeEditableInContext = (ruleTypeId: string) =>
    ruleTypeRegistry.has(ruleTypeId) ? !ruleTypeRegistry.get(ruleTypeId).requiresAppContext : false;

  useEffect(() => {
    loadRulesData();
  }, [
    ruleTypesState,
    page,
    searchText,
    percentileOptions,
    JSON.stringify(typesFilter),
    JSON.stringify(actionTypesFilter),
    JSON.stringify(ruleExecutionStatusesFilter),
    JSON.stringify(ruleStatusesFilter),
    JSON.stringify(tagsFilter),
  ]);

  useEffect(() => {
    (async () => {
      try {
        setRuleTypesState({ ...ruleTypesState, isLoading: true });
        const ruleTypes = await loadRuleTypes({ http });
        const index: RuleTypeIndex = new Map();
        for (const ruleType of ruleTypes) {
          index.set(ruleType.id, ruleType);
        }
        setRuleTypesState({ isLoading: false, data: index, isInitialized: true });
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
        const result = await loadActionTypes({ http });
        const sortedResult = result
          .filter(
            // TODO: Remove "DEFAULT_HIDDEN_ACTION_TYPES" when cases connector is available across Kibana.
            // Issue: https://github.com/elastic/kibana/issues/82502.
            ({ id }) => actionTypeRegistry.has(id) && !DEFAULT_HIDDEN_ACTION_TYPES.includes(id)
          )
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

  async function loadRulesData() {
    const hasAnyAuthorizedRuleType = ruleTypesState.isInitialized && ruleTypesState.data.size > 0;
    if (hasAnyAuthorizedRuleType) {
      setRulesState({ ...rulesState, isLoading: true });
      try {
        const rulesResponse = await loadRules({
          http,
          page,
          searchText,
          typesFilter,
          actionTypesFilter,
          ruleExecutionStatusesFilter,
          ruleStatusesFilter,
          tagsFilter,
          sort,
        });
        await loadRuleTagsAggs();
        await loadRuleAggs();
        setRulesState({
          isLoading: false,
          data: rulesResponse.data,
          totalItemCount: rulesResponse.total,
        });

        if (!rulesResponse.data?.length && page.index > 0) {
          setPage({ ...page, index: 0 });
        }

        const isFilterApplied = !(
          isEmpty(searchText) &&
          isEmpty(typesFilter) &&
          isEmpty(actionTypesFilter) &&
          isEmpty(ruleExecutionStatusesFilter) &&
          isEmpty(ruleStatusesFilter) &&
          isEmpty(tagsFilter)
        );

        setNoData(rulesResponse.data.length === 0 && !isFilterApplied);
      } catch (e) {
        toasts.addDanger({
          title: i18n.translate(
            'xpack.triggersActionsUI.sections.rulesList.unableToLoadRulesMessage',
            {
              defaultMessage: 'Unable to load rules',
            }
          ),
        });
        setRulesState({ ...rulesState, isLoading: false });
      }
      setInitialLoad(false);
    }
  }

  async function loadRuleAggs() {
    try {
      const rulesAggs = await loadRuleAggregations({
        http,
        searchText,
        typesFilter,
        actionTypesFilter,
        ruleExecutionStatusesFilter,
        ruleStatusesFilter,
        tagsFilter,
      });
      if (rulesAggs?.ruleExecutionStatus) {
        setRulesStatusesTotal(rulesAggs.ruleExecutionStatus);
      }
    } catch (e) {
      toasts.addDanger({
        title: i18n.translate(
          'xpack.triggersActionsUI.sections.rulesList.unableToLoadRuleStatusInfoMessage',
          {
            defaultMessage: 'Unable to load rule status info',
          }
        ),
      });
    }
  }

  async function loadRuleTagsAggs() {
    if (!isRuleTagFilterEnabled) {
      return;
    }
    try {
      const ruleTagsAggs = await loadRuleTags({ http });
      if (ruleTagsAggs?.ruleTags) {
        setTags(ruleTagsAggs.ruleTags);
      }
    } catch (e) {
      toasts.addDanger({
        title: i18n.translate('xpack.triggersActionsUI.sections.rulesList.unableToLoadRuleTags', {
          defaultMessage: 'Unable to load rule tags',
        }),
      });
    }
  }

  const renderRuleStatusDropdown = (ruleEnabled: boolean | undefined, item: RuleTableItem) => {
    return (
      <RuleStatusDropdown
        disableRule={async () => await disableRule({ http, id: item.id })}
        enableRule={async () => await enableRule({ http, id: item.id })}
        snoozeRule={async (snoozeEndTime: string | -1, interval: string | null) => {
          await snoozeRule({ http, id: item.id, snoozeEndTime });
        }}
        unsnoozeRule={async () => await unsnoozeRule({ http, id: item.id })}
        rule={item}
        onRuleChanged={() => loadRulesData()}
        isEditable={item.isEditable && isRuleTypeEditableInContext(item.ruleTypeId)}
      />
    );
  };

  const renderRuleExecutionStatus = (executionStatus: RuleExecutionStatus, item: RuleTableItem) => {
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
      <EuiToolTip data-test-subj="ruleStatus-error-tooltip" position="top" content={tooltipMessage}>
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
              onClick={() =>
                setManageLicenseModalOpts({
                  licenseType: ruleTypesState.data.get(item.ruleTypeId)?.minimumLicenseRequired!,
                  ruleTypeId: item.ruleTypeId,
                })
              }
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
  };

  const renderPercentileColumnName = () => {
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
          onOptionsChange={setPercentileOptions}
        />
      </span>
    );
  };

  const renderPercentileCellValue = (value: number) => {
    return (
      <span data-test-subj={`${selectedPercentile}Percentile`}>
        <RuleDurationFormat allowZero={false} duration={value} />
      </span>
    );
  };

  const getPercentileColumn = () => {
    return {
      mobileOptions: { header: false },
      field: percentileFields[selectedPercentile!],
      width: '16%',
      name: renderPercentileColumnName(),
      'data-test-subj': 'rulesTableCell-ruleExecutionPercentile',
      sortable: true,
      truncateText: false,
      render: renderPercentileCellValue,
    };
  };

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

  const getRulesTableColumns = (): Array<
    | EuiTableFieldDataColumnType<RuleTableItem>
    | EuiTableComputedColumnType<RuleTableItem>
    | EuiTableActionsColumnType<RuleTableItem>
  > => {
    return [
      {
        field: 'name',
        name: i18n.translate(
          'xpack.triggersActionsUI.sections.rulesList.rulesListTable.columns.nameTitle',
          { defaultMessage: 'Name' }
        ),
        sortable: true,
        truncateText: true,
        width: '30%',
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
                      <EuiLink
                        title={name}
                        onClick={() => {
                          history.push(routeToRuleDetails.replace(`:ruleId`, rule.id));
                        }}
                      >
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
        field: 'tags',
        name: '',
        sortable: false,
        width: '50px',
        'data-test-subj': 'rulesTableCell-tagsPopover',
        render: (ruleTags: string[], item: RuleTableItem) => {
          return ruleTags.length > 0 ? (
            <RuleTagBadge
              isOpen={tagPopoverOpenIndex === item.index}
              tags={ruleTags}
              onClick={() => setTagPopoverOpenIndex(item.index)}
              onClose={() => setTagPopoverOpenIndex(-1)}
            />
          ) : null;
        },
      },
      {
        field: 'executionStatus.lastExecutionDate',
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
        width: '15%',
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
        field: 'schedule.interval',
        width: '6%',
        name: i18n.translate(
          'xpack.triggersActionsUI.sections.rulesList.rulesListTable.columns.scheduleTitle',
          { defaultMessage: 'Interval' }
        ),
        sortable: false,
        truncateText: false,
        'data-test-subj': 'rulesTableCell-interval',
        render: (interval: string, item: RuleTableItem) => {
          const durationString = formatDuration(interval);
          return (
            <>
              <EuiFlexGroup direction="row" gutterSize="xs">
                <EuiFlexItem grow={false}>{durationString}</EuiFlexItem>
                <EuiFlexItem grow={false}>
                  {item.showIntervalWarning && (
                    <EuiToolTip
                      data-test-subj={`ruleInterval-config-tooltip-${item.index}`}
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
                        data-test-subj={`ruleInterval-config-icon-${item.index}`}
                        onClick={() => {
                          if (item.isEditable && isRuleTypeEditableInContext(item.ruleTypeId)) {
                            onRuleEdit(item);
                          }
                        }}
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
        field: 'executionStatus.lastDuration',
        width: '12%',
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
        render: (value: number, item: RuleTableItem) => {
          const showDurationWarning = shouldShowDurationWarning(
            ruleTypesState.data.get(item.ruleTypeId),
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
      getPercentileColumn(),
      {
        field: 'monitoring.execution.calculated_metrics.success_ratio',
        width: '12%',
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
        field: 'executionStatus.status',
        name: i18n.translate(
          'xpack.triggersActionsUI.sections.rulesList.rulesListTable.columns.lastResponseTitle',
          { defaultMessage: 'Last response' }
        ),
        sortable: true,
        truncateText: false,
        width: '120px',
        'data-test-subj': 'rulesTableCell-lastResponse',
        render: (_executionStatus: RuleExecutionStatus, item: RuleTableItem) => {
          return renderRuleExecutionStatus(item.executionStatus, item);
        },
      },
      {
        field: 'enabled',
        name: i18n.translate(
          'xpack.triggersActionsUI.sections.rulesList.rulesListTable.columns.stateTitle',
          { defaultMessage: 'State' }
        ),
        sortable: true,
        truncateText: false,
        width: '10%',
        'data-test-subj': 'rulesTableCell-status',
        render: (_enabled: boolean | undefined, item: RuleTableItem) => {
          return renderRuleStatusDropdown(item.enabled, item);
        },
      },
      {
        name: '',
        width: '90px',
        render(item: RuleTableItem) {
          return (
            <EuiFlexGroup justifyContent="flexEnd" gutterSize="none">
              <EuiFlexItem grow={false} className="ruleSidebarItem">
                <EuiFlexGroup justifyContent="flexEnd" gutterSize="xs">
                  {item.isEditable && isRuleTypeEditableInContext(item.ruleTypeId) ? (
                    <EuiFlexItem grow={false} data-test-subj="ruleSidebarEditAction">
                      <EuiButtonIcon
                        color={'primary'}
                        title={i18n.translate(
                          'xpack.triggersActionsUI.sections.rulesList.rulesListTable.columns.editButtonTooltip',
                          { defaultMessage: 'Edit' }
                        )}
                        className="ruleSidebarItem__action"
                        data-test-subj="editActionHoverButton"
                        onClick={() => onRuleEdit(item)}
                        iconType={'pencil'}
                        aria-label={i18n.translate(
                          'xpack.triggersActionsUI.sections.rulesList.rulesListTable.columns.editAriaLabel',
                          { defaultMessage: 'Edit' }
                        )}
                      />
                    </EuiFlexItem>
                  ) : null}
                  {item.isEditable ? (
                    <EuiFlexItem grow={false} data-test-subj="ruleSidebarDeleteAction">
                      <EuiButtonIcon
                        color={'danger'}
                        title={i18n.translate(
                          'xpack.triggersActionsUI.sections.rulesList.rulesListTable.columns.deleteButtonTooltip',
                          { defaultMessage: 'Delete' }
                        )}
                        className="ruleSidebarItem__action"
                        data-test-subj="deleteActionHoverButton"
                        onClick={() => setRulesToDelete([item.id])}
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
                <CollapsedItemActions
                  key={item.id}
                  item={item}
                  onRuleChanged={() => loadRulesData()}
                  setRulesToDelete={setRulesToDelete}
                  onEditRule={() => onRuleEdit(item)}
                />
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
        render: (item: RuleTableItem) => {
          const _executionStatus = item.executionStatus;
          const hasErrorMessage = _executionStatus.status === 'error';
          const isLicenseError =
            _executionStatus.error?.reason === RuleExecutionStatusErrorReasons.License;

          return isLicenseError || hasErrorMessage ? (
            <EuiButtonIcon
              onClick={() => toggleErrorMessage(_executionStatus, item)}
              aria-label={itemIdToExpandedRowMap[item.id] ? 'Collapse' : 'Expand'}
              iconType={itemIdToExpandedRowMap[item.id] ? 'arrowUp' : 'arrowDown'}
            />
          ) : null;
        },
      },
    ];
  };

  const authorizedRuleTypes = [...ruleTypesState.data.values()];
  const authorizedToCreateAnyRules = authorizedRuleTypes.some(
    (ruleType) => ruleType.authorizedConsumers[ALERTS_FEATURE_ID]?.all
  );

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
      return [<RuleTagFilter tags={tags} selectedTags={tagsFilter} onChange={setTagsFilter} />];
    }
    return [];
  };

  const getRuleStatusFilter = () => {
    if (isRuleStatusFilterEnabled) {
      return [
        <RuleStatusFilter selectedStatuses={ruleStatusesFilter} onChange={setRuleStatusesFilter} />,
      ];
    }
    return [];
  };

  const toolsRight = [
    <TypeFilter
      key="type-filter"
      onChange={(types: string[]) => setTypesFilter(types)}
      options={sortBy(Object.entries(groupRuleTypesByProducer())).map(
        ([groupName, ruleTypesOptions]) => ({
          groupName: getProducerFeatureName(groupName) ?? capitalize(groupName),
          subOptions: ruleTypesOptions.sort((a, b) => a.name.localeCompare(b.name)),
        })
      )}
    />,
    ...getRuleTagFilter(),
    ...getRuleStatusFilter(),
    <ActionTypeFilter
      key="action-type-filter"
      actionTypes={actionTypes}
      onChange={(ids: string[]) => setActionTypesFilter(ids)}
    />,
    <RuleExecutionStatusFilter
      key="rule-status-filter"
      selectedStatuses={ruleExecutionStatusesFilter}
      onChange={(ids: string[]) => setRuleExecutionStatusesFilter(ids)}
    />,
    <EuiButtonEmpty
      data-test-subj="refreshRulesButton"
      iconType="refresh"
      onClick={loadRulesData}
      name="refresh"
      color="primary"
    >
      <FormattedMessage
        id="xpack.triggersActionsUI.sections.rulesList.refreshRulesButtonLabel"
        defaultMessage="Refresh"
      />
    </EuiButtonEmpty>,
  ];

  const authorizedToModifySelectedRules = selectedIds.length
    ? filterRulesById(rulesState.data, selectedIds).every((selectedRule) =>
        hasAllPrivilege(selectedRule, ruleTypesState.data.get(selectedRule.ruleTypeId))
      )
    : false;

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
        {selectedIds.length > 0 && authorizedToModifySelectedRules && (
          <EuiFlexItem grow={false}>
            <BulkOperationPopover>
              <RuleQuickEditButtons
                selectedItems={convertRulesToTableItems({
                  rules: filterRulesById(rulesState.data, selectedIds),
                  ruleTypeIndex: ruleTypesState.data,
                  canExecuteActions,
                  config,
                })}
                onPerformingAction={() => setIsPerformingAction(true)}
                onActionPerformed={() => {
                  loadRulesData();
                  setIsPerformingAction(false);
                }}
                setRulesToDelete={setRulesToDelete}
              />
            </BulkOperationPopover>
          </EuiFlexItem>
        )}
        {authorizedToCreateAnyRules ? (
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
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="s">
            {toolsRight.map((tool, index: number) => (
              <EuiFlexItem key={index} grow={false}>
                {tool}
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
        <EuiFlexItem>
          <EuiFlexGroup gutterSize="none">
            <EuiFlexItem grow={false}>
              <EuiText size="s" color="subdued" data-test-subj="totalRulesCount">
                <FormattedMessage
                  id="xpack.triggersActionsUI.sections.rulesList.totalItemsCountDescription"
                  defaultMessage="Showing: {pageSize} of {totalItemCount} rules."
                  values={{
                    totalItemCount: rulesState.totalItemCount,
                    pageSize: rulesState.data.length,
                  }}
                />
              </EuiText>
            </EuiFlexItem>
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
      <EuiHorizontalRule margin="xs" />

      <EuiBasicTable
        loading={rulesState.isLoading || ruleTypesState.isLoading || isPerformingAction}
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
        columns={getRulesTableColumns()}
        sorting={{ sort }}
        rowProps={(item: RuleTableItem) => ({
          'data-test-subj': 'rule-row',
          className: !ruleTypesState.data.get(item.ruleTypeId)?.enabledInLicense
            ? 'actRulesList__tableRowDisabled'
            : '',
        })}
        cellProps={(item: RuleTableItem) => ({
          'data-test-subj': 'cell',
          className: !ruleTypesState.data.get(item.ruleTypeId)?.enabledInLicense
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
          onSelectionChange(updatedSelectedItemsList: RuleTableItem[]) {
            setSelectedIds(updatedSelectedItemsList.map((item) => item.id));
          },
        }}
        onChange={({
          page: changedPage,
          sort: changedSort,
        }: {
          page?: Pagination;
          sort?: EuiTableSortingType<RuleTableItem>['sort'];
        }) => {
          if (changedPage) {
            setPage(changedPage);
          }
          if (changedSort) {
            setSort(changedSort);
          }
        }}
        itemIdToExpandedRowMap={itemIdToExpandedRowMap}
        isExpandable={true}
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
        <EmptyPrompt onCTAClicked={() => setRuleFlyoutVisibility(true)} />
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
      <DeleteModalConfirmation
        onDeleted={async () => {
          setRulesToDelete([]);
          setSelectedIds([]);
          await loadRulesData();
        }}
        onErrors={async () => {
          // Refresh the rules from the server, some rules may have beend deleted
          await loadRulesData();
          setRulesToDelete([]);
        }}
        onCancel={() => {
          setRulesToDelete([]);
        }}
        apiDeleteCall={deleteRules}
        idsToDelete={rulesToDelete}
        singleTitle={i18n.translate('xpack.triggersActionsUI.sections.rulesList.singleTitle', {
          defaultMessage: 'rule',
        })}
        multipleTitle={i18n.translate('xpack.triggersActionsUI.sections.rulesList.multipleTitle', {
          defaultMessage: 'rules',
        })}
        setIsLoadingState={(isLoading: boolean) => {
          setRulesState({ ...rulesState, isLoading });
        }}
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
          onSave={loadRulesData}
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
          onSave={loadRulesData}
        />
      )}
    </section>
  );
};

// eslint-disable-next-line import/no-default-export
export { RulesList as default };

const noPermissionPrompt = (
  <EuiEmptyPrompt
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

interface ConvertRulesToTableItemsOpts {
  rules: Rule[];
  ruleTypeIndex: RuleTypeIndex;
  canExecuteActions: boolean;
  config: TriggersActionsUiConfig;
}

function convertRulesToTableItems(opts: ConvertRulesToTableItemsOpts): RuleTableItem[] {
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
