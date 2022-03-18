/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo } from 'react';
import {
  EuiButton,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiText,
  EuiHorizontalRule,
  EuiAutoRefreshButton,
  EuiTableSortingType,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { useBreadcrumbs } from '../../hooks/use_breadcrumbs';
import { useKibana } from '../../utils/kibana_react';
import { useFetchRules } from '../../hooks/use_fetch_rules';
import { RulesTable } from './components/rules_table';
import { Name } from './components/name';
import { LastResponseFilter } from './components/last_response_filter';
import { StatusContext } from './components/status_context';
import { ExecutionStatus } from './components/execution_status';
import { LastRun } from './components/last_run';
import { EditRuleFlyout } from './components/edit_rule_flyout';
import { DeleteModalConfirmation } from './components/delete_modal_confirmation';
import {
  deleteRules,
  RuleTableItem,
  enableRule,
  disableRule,
  muteRule,
  useLoadRuleTypes,
} from '../../../../triggers_actions_ui/public';
import { AlertExecutionStatus, ALERTS_FEATURE_ID } from '../../../../alerting/common';
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
} from './translations';

export function RulesPage() {
  const { ObservabilityPageTemplate } = usePluginContext();
  const {
    http,
    docLinks,
    triggersActionsUi,
    application: { capabilities },
    notifications: { toasts },
  } = useKibana().services;
  const ruleTypeRegistry = triggersActionsUi.ruleTypeRegistry;
  const canExecuteActions = hasExecuteActionsCapability(capabilities);
  const [page, setPage] = useState<Pagination>({ index: 0, size: DEFAULT_SEARCH_PAGE_SIZE });
  const [sort, setSort] = useState<EuiTableSortingType<RuleTableItem>['sort']>({
    field: 'name',
    direction: 'asc',
  });
  const [ruleLastResponseFilter, setRuleLastResponseFilter] = useState<string[]>([]);
  const [currentRuleToEdit, setCurrentRuleToEdit] = useState<RuleTableItem | null>(null);
  const [rulesToDelete, setRulesToDelete] = useState<string[]>([]);
  const [createRuleFlyoutVisibility, setCreateRuleFlyoutVisibility] = useState(false);

  const isRuleTypeEditableInContext = (ruleTypeId: string) =>
    ruleTypeRegistry.has(ruleTypeId) ? !ruleTypeRegistry.get(ruleTypeId).requiresAppContext : false;

  const onRuleEdit = (ruleItem: RuleTableItem) => {
    setCurrentRuleToEdit(ruleItem);
  };

  const { rulesState, setRulesState, reload } = useFetchRules({
    ruleLastResponseFilter,
    page,
    sort,
  });
  const { data: rules, totalItemCount, error } = rulesState;
  const { ruleTypeIndex, ruleTypes } = useLoadRuleTypes({
    filteredSolutions: OBSERVABILITY_SOLUTIONS,
  });
  const authorizedRuleTypes = [...ruleTypes.values()];

  const authorizedToCreateAnyRules = authorizedRuleTypes.some(
    (ruleType) => ruleType.authorizedConsumers[ALERTS_FEATURE_ID]?.all
  );
  useBreadcrumbs([
    {
      text: RULES_BREADCRUMB_TEXT,
    },
  ]);

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
        render: (_executionStatus: AlertExecutionStatus, item: RuleTableItem) => (
          <ExecutionStatus executionStatus={item.executionStatus} />
        ),
      },
      {
        field: 'enabled',
        name: STATUS_COLUMN_TITLE,
        sortable: true,
        render: (_enabled: boolean, item: RuleTableItem) => {
          return (
            <StatusContext
              item={item}
              onStatusChanged={() => reload()}
              enableRule={async () => await enableRule({ http, id: item.id })}
              disableRule={async () => await disableRule({ http, id: item.id })}
              muteRule={async () => await muteRule({ http, id: item.id })}
            />
          );
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

  return (
    <ObservabilityPageTemplate
      pageHeader={{
        pageTitle: <>{RULES_PAGE_TITLE} </>,
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
            href={docLinks.links.alerting.guide}
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
      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <LastResponseFilter
            key="rule-lastResponse-filter"
            selectedStatuses={ruleLastResponseFilter}
            onChange={(ids: string[]) => setRuleLastResponseFilter(ids)}
          />
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
        <EuiFlexItem>
          <EuiAutoRefreshButton
            isPaused={false}
            refreshInterval={3000}
            onRefreshChange={() => {}}
            shortHand
          />
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
      {error &&
        toasts.addDanger({
          title: error,
        })}
      {currentRuleToEdit && <EditRuleFlyout onSave={reload} currentRule={currentRuleToEdit} />}
      {createRuleFlyoutVisibility && CreateRuleFlyout}
    </ObservabilityPageTemplate>
  );
}
