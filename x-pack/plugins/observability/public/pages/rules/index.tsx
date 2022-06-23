/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { capitalize, sortBy } from 'lodash';
import {
  EuiButton,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiText,
  EuiHorizontalRule,
  EuiTableSortingType,
  EuiFieldSearch,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  deleteRules,
  RuleTableItem,
  RuleStatus,
  enableRule,
  disableRule,
  snoozeRule,
  useLoadRuleTypes,
  unsnoozeRule,
} from '@kbn/triggers-actions-ui-plugin/public';
import { RuleExecutionStatus, ALERTS_FEATURE_ID } from '@kbn/alerting-plugin/common';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { Provider, rulesPageStateContainer, useRulesPageStateContainer } from './state_container';

import { useBreadcrumbs } from '../../hooks/use_breadcrumbs';
import { useKibana } from '../../utils/kibana_react';
import { useFetchRules } from '../../hooks/use_fetch_rules';
import { RulesTable } from './components/rules_table';
import { Name } from './components/name';
import { LastResponseFilter } from './components/last_response_filter';
import { TypeFilter } from './components/type_filter';
import { ExecutionStatus } from './components/execution_status';
import { LastRun } from './components/last_run';
import { EditRuleFlyout } from './components/edit_rule_flyout';
import { DeleteModalConfirmation } from './components/delete_modal_confirmation';
import { NoDataPrompt } from './components/prompts/no_data_prompt';
import { NoPermissionPrompt } from './components/prompts/no_permission_prompt';
import { CenterJustifiedSpinner } from './components/center_justified_spinner';
import { Pagination } from './types';
import {
  DEFAULT_SEARCH_PAGE_SIZE,
  convertRulesToTableItems,
  OBSERVABILITY_SOLUTIONS,
  hasExecuteActionsCapability,
} from './config';
import {
  LAST_RESPONSE_COLUMN_TITLE,
  LAST_RUN_COLUMN_TITLE,
  RULE_COLUMN_TITLE,
  STATUS_COLUMN_TITLE,
  ACTIONS_COLUMN_TITLE,
  EDIT_ACTION_ARIA_LABEL,
  EDIT_ACTION_TOOLTIP,
  DELETE_ACTION_TOOLTIP,
  DELETE_ACTION_ARIA_LABEL,
  RULES_PAGE_TITLE,
  RULES_BREADCRUMB_TEXT,
  RULES_SINGLE_TITLE,
  RULES_PLURAL_TITLE,
  SEARCH_PLACEHOLDER,
} from './translations';
const ENTER_KEY = 13;

function RulesPage() {
  const { ObservabilityPageTemplate, kibanaFeatures } = usePluginContext();
  const {
    http,
    docLinks,
    triggersActionsUi,
    application: { capabilities },
    notifications: { toasts },
  } = useKibana().services;
  const documentationLink = docLinks.links.observability.createAlerts;
  const ruleTypeRegistry = triggersActionsUi.ruleTypeRegistry;
  const canExecuteActions = hasExecuteActionsCapability(capabilities);
  const [page, setPage] = useState<Pagination>({ index: 0, size: DEFAULT_SEARCH_PAGE_SIZE });
  const [sort, setSort] = useState<EuiTableSortingType<RuleTableItem>['sort']>({
    field: 'name',
    direction: 'asc',
  });
  const [inputText, setInputText] = useState<string | undefined>();
  const [searchText, setSearchText] = useState<string | undefined>();
  const [tagsFilter, setTagsFilter] = useState<string[]>([]);
  const [typesFilter, setTypesFilter] = useState<string[]>([]);
  const { lastResponse, setLastResponse } = useRulesPageStateContainer();
  const { status, setStatus } = useRulesPageStateContainer();
  const [currentRuleToEdit, setCurrentRuleToEdit] = useState<RuleTableItem | null>(null);
  const [rulesToDelete, setRulesToDelete] = useState<string[]>([]);
  const [createRuleFlyoutVisibility, setCreateRuleFlyoutVisibility] = useState(false);
  const [tagPopoverOpenIndex, setTagPopoverOpenIndex] = useState<number>(-1);

  const isRuleTypeEditableInContext = (ruleTypeId: string) =>
    ruleTypeRegistry.has(ruleTypeId) ? !ruleTypeRegistry.get(ruleTypeId).requiresAppContext : false;

  const onRuleEdit = (ruleItem: RuleTableItem) => {
    setCurrentRuleToEdit(ruleItem);
  };

  const { rulesState, setRulesState, reload, noData, initialLoad, tagsState } = useFetchRules({
    searchText,
    ruleLastResponseFilter: lastResponse,
    ruleStatusesFilter: status,
    typesFilter,
    tagsFilter,
    page,
    setPage,
    sort,
  });
  const { data: rules, totalItemCount, error } = rulesState;
  const { data: tags, error: tagsError } = tagsState;

  const { ruleTypeIndex, ruleTypes } = useLoadRuleTypes({
    filteredSolutions: OBSERVABILITY_SOLUTIONS,
  });
  const authorizedRuleTypes = [...ruleTypes.values()];

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
  const authorizedToCreateAnyRules = authorizedRuleTypes.some(
    (ruleType) => ruleType.authorizedConsumers[ALERTS_FEATURE_ID]?.all
  );

  useBreadcrumbs([
    {
      text: i18n.translate('xpack.observability.breadcrumbs.alertsLinkText', {
        defaultMessage: 'Alerts',
      }),
      href: http.basePath.prepend('/app/observability/alerts'),
    },
    {
      text: RULES_BREADCRUMB_TEXT,
    },
  ]);

  useEffect(() => {
    if (tagsError) {
      toasts.addDanger({
        title: tagsError,
      });
    }
    if (error)
      toasts.addDanger({
        title: error,
      });
  }, [tagsError, error, toasts]);

  const getRulesTableColumns = () => {
    return [
      {
        field: 'name',
        name: RULE_COLUMN_TITLE,
        sortable: true,
        truncateText: true,
        width: '30%',
        'data-test-subj': 'rulesTableCell-name',
        render: (name: string, rule: RuleTableItem) => <Name name={name} rule={rule} />,
      },
      {
        field: 'tags',
        name: '',
        sortable: false,
        width: '50px',
        'data-test-subj': 'rulesTableCell-tagsPopover',
        render: (ruleTags: string[], item: RuleTableItem) => {
          return ruleTags.length > 0
            ? triggersActionsUi.getRuleTagBadge<'default'>({
                isOpen: tagPopoverOpenIndex === item.index,
                tags: ruleTags,
                onClick: () => setTagPopoverOpenIndex(item.index),
                onClose: () => setTagPopoverOpenIndex(-1),
              })
            : null;
        },
      },
      {
        field: 'executionStatus.lastExecutionDate',
        name: LAST_RUN_COLUMN_TITLE,
        sortable: true,
        render: (date: Date) => <LastRun date={date} />,
      },
      {
        field: 'executionStatus.status',
        name: LAST_RESPONSE_COLUMN_TITLE,
        sortable: true,
        truncateText: false,
        width: '120px',
        'data-test-subj': 'rulesTableCell-status',
        render: (_executionStatus: RuleExecutionStatus, item: RuleTableItem) => (
          <ExecutionStatus
            executionStatus={item.executionStatus}
            item={item}
            licenseType={ruleTypeIndex.get(item.ruleTypeId)?.minimumLicenseRequired!}
          />
        ),
      },
      {
        field: 'enabled',
        name: STATUS_COLUMN_TITLE,
        sortable: true,
        'data-test-subj': 'rulesTableCell-ContextStatus',
        render: (_enabled: boolean, item: RuleTableItem) => {
          return triggersActionsUi.getRuleStatusDropdown({
            rule: item,
            enableRule: async () => await enableRule({ http, id: item.id }),
            disableRule: async () => await disableRule({ http, id: item.id }),
            onRuleChanged: () => reload(),
            isEditable: item.isEditable && isRuleTypeEditableInContext(item.ruleTypeId),
            snoozeRule: async (snoozeSchedule) => {
              await snoozeRule({ http, id: item.id, snoozeSchedule });
            },
            unsnoozeRule: async (scheduleIds) =>
              await unsnoozeRule({ http, id: item.id, scheduleIds }),
          });
        },
      },
      {
        name: ACTIONS_COLUMN_TITLE,
        width: '10%',
        render(item: RuleTableItem) {
          return (
            <EuiFlexGroup justifyContent="spaceBetween" gutterSize="s">
              <EuiFlexItem grow={false} className="ruleSidebarItem">
                <EuiFlexGroup justifyContent="flexEnd" gutterSize="s">
                  <EuiFlexItem grow={false} data-test-subj="ruleSidebarEditAction">
                    <EuiButtonIcon
                      isDisabled={
                        !(item.isEditable && isRuleTypeEditableInContext(item.ruleTypeId))
                      }
                      color={'primary'}
                      title={EDIT_ACTION_TOOLTIP}
                      className="ruleSidebarItem__action"
                      data-test-subj="editActionHoverButton"
                      onClick={() => onRuleEdit(item)}
                      iconType={'pencil'}
                      aria-label={EDIT_ACTION_ARIA_LABEL}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false} data-test-subj="ruleSidebarDeleteAction">
                    <EuiButtonIcon
                      isDisabled={!item.isEditable}
                      color={'danger'}
                      title={DELETE_ACTION_TOOLTIP}
                      className="ruleSidebarItem__action"
                      data-test-subj="deleteActionHoverButton"
                      onClick={() => setRulesToDelete([item.id])}
                      iconType={'trash'}
                      aria-label={DELETE_ACTION_ARIA_LABEL}
                    />
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
          );
        },
      },
    ];
  };

  const CreateRuleFlyout = useMemo(
    () =>
      triggersActionsUi.getAddAlertFlyout({
        consumer: ALERTS_FEATURE_ID,
        onClose: () => {
          setCreateRuleFlyoutVisibility(false);
          reload();
        },
        filteredSolutions: OBSERVABILITY_SOLUTIONS,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const setRuleStatusFilter = useCallback(
    (ids: RuleStatus[]) => {
      setStatus(ids);
    },
    [setStatus]
  );

  const setExecutionStatusFilter = useCallback(
    (ids: string[]) => {
      setLastResponse(ids);
    },
    [setLastResponse]
  );

  const getRulesTable = () => {
    if (noData && !rulesState.isLoading) {
      return authorizedToCreateAnyRules ? (
        <NoDataPrompt
          documentationLink={documentationLink}
          onCTAClicked={() => setCreateRuleFlyoutVisibility(true)}
        />
      ) : (
        <NoPermissionPrompt />
      );
    }
    if (initialLoad) {
      return <CenterJustifiedSpinner />;
    }

    return (
      <>
        <EuiFlexGroup>
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
              placeholder={SEARCH_PLACEHOLDER}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <TypeFilter
              key="type-filter"
              onChange={(types: string[]) => setTypesFilter(types)}
              options={sortBy(Object.entries(groupRuleTypesByProducer())).map(
                ([groupName, ruleTypesOptions]) => ({
                  groupName: getProducerFeatureName(groupName) ?? capitalize(groupName),
                  subOptions: ruleTypesOptions.sort((a, b) => a.name.localeCompare(b.name)),
                })
              )}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            {triggersActionsUi.getRuleTagFilter({
              tags,
              selectedTags: tagsFilter,
              onChange: (myTags: string[]) => setTagsFilter(myTags),
            })}
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <LastResponseFilter
              key="rule-lastResponse-filter"
              selectedStatuses={lastResponse}
              onChange={setExecutionStatusFilter}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            {triggersActionsUi.getRuleStatusFilter({
              selectedStatuses: status,
              onChange: setRuleStatusFilter,
            })}
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              data-test-subj="refreshRulesButton"
              iconType="refresh"
              onClick={reload}
              name="refresh"
              color="primary"
            >
              <FormattedMessage
                id="xpack.observability.rules.refreshRulesButtonLabel"
                defaultMessage="Refresh"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiFlexGroup>
          <EuiFlexItem grow={false}>
            <EuiText size="s" color="subdued" data-test-subj="totalAlertsCount">
              <FormattedMessage
                id="xpack.observability.rules.totalItemsCountDescription"
                defaultMessage="Showing: {pageSize} of {totalItemCount} Rules"
                values={{
                  totalItemCount,
                  pageSize: rules.length,
                }}
              />
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiHorizontalRule margin="xs" />
        <EuiFlexGroup direction="column" gutterSize="s">
          <EuiFlexItem>
            <RulesTable
              columns={getRulesTableColumns()}
              rules={convertRulesToTableItems(rules, ruleTypeIndex, canExecuteActions)}
              isLoading={rulesState.isLoading}
              page={page}
              totalItemCount={totalItemCount}
              onPageChange={(index) => setPage(index)}
              sort={sort}
              onSortChange={(changedSort) => {
                setSort(changedSort);
              }}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </>
    );
  };
  return (
    <ObservabilityPageTemplate
      pageHeader={{
        pageTitle: <>{RULES_PAGE_TITLE}</>,
        rightSideItems: [
          authorizedToCreateAnyRules && (
            <EuiButton
              iconType="plusInCircle"
              key="create-alert"
              data-test-subj="createRuleButton"
              fill
              onClick={() => setCreateRuleFlyoutVisibility(true)}
            >
              <FormattedMessage
                id="xpack.observability.rules.addRuleButtonLabel"
                defaultMessage="Create rule"
              />
            </EuiButton>
          ),
          <EuiButtonEmpty
            href={documentationLink}
            target="_blank"
            iconType="help"
            data-test-subj="documentationLink"
          >
            <FormattedMessage
              id="xpack.observability.rules.docsLinkText"
              defaultMessage="Documentation"
            />
          </EuiButtonEmpty>,
        ],
      }}
    >
      <DeleteModalConfirmation
        onDeleted={async () => {
          // a new state that rule is deleted, that's the one
          setRulesToDelete([]);
          // this should cause the fetcher to reload the rules
          reload();
        }}
        onErrors={async () => {
          // Refresh the rules from the server, some rules may have beend deleted
          reload();
          setRulesToDelete([]);
        }}
        onCancel={() => {
          setRulesToDelete([]);
        }}
        apiDeleteCall={deleteRules}
        idsToDelete={rulesToDelete}
        singleTitle={RULES_SINGLE_TITLE}
        multipleTitle={RULES_PLURAL_TITLE}
        setIsLoadingState={(isLoading: boolean) => {
          setRulesState({ ...rulesState, isLoading });
        }}
      />

      {getRulesTable()}
      {currentRuleToEdit && <EditRuleFlyout onSave={reload} currentRule={currentRuleToEdit} />}
      {createRuleFlyoutVisibility && CreateRuleFlyout}
    </ObservabilityPageTemplate>
  );
}

function WrappedRulesPage() {
  return (
    <Provider value={rulesPageStateContainer}>
      <RulesPage />
    </Provider>
  );
}

export { WrappedRulesPage as RulesPage };
