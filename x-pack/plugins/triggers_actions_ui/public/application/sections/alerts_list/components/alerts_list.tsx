/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable react-hooks/exhaustive-deps */

import { i18n } from '@kbn/i18n';
import { capitalize, sortBy } from 'lodash';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { useEffect, useState, Fragment } from 'react';
import {
  EuiBasicTable,
  EuiBadge,
  EuiButton,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiLink,
  EuiEmptyPrompt,
  EuiCallOut,
  EuiButtonEmpty,
  EuiHealth,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { useHistory } from 'react-router-dom';

import { isEmpty } from 'lodash';
import { ActionType, Alert, AlertTableItem, AlertTypeIndex, Pagination } from '../../../../types';
import { AlertAdd } from '../../alert_form';
import { BulkOperationPopover } from '../../common/components/bulk_operation_popover';
import { AlertQuickEditButtonsWithApi as AlertQuickEditButtons } from '../../common/components/alert_quick_edit_buttons';
import { CollapsedItemActionsWithApi as CollapsedItemActions } from './collapsed_item_actions';
import { TypeFilter } from './type_filter';
import { ActionTypeFilter } from './action_type_filter';
import { AlertStatusFilter, getHealthColor } from './alert_status_filter';
import {
  loadAlerts,
  loadAlertAggregations,
  loadAlertTypes,
  deleteAlerts,
} from '../../../lib/alert_api';
import { loadActionTypes } from '../../../lib/action_connector_api';
import { hasExecuteActionsCapability } from '../../../lib/capabilities';
import { routeToAlertDetails, DEFAULT_SEARCH_PAGE_SIZE } from '../../../constants';
import { DeleteModalConfirmation } from '../../../components/delete_modal_confirmation';
import { EmptyPrompt } from '../../../components/prompts/empty_prompt';
import {
  AlertExecutionStatus,
  AlertExecutionStatusValues,
  ALERTS_FEATURE_ID,
  AlertExecutionStatusErrorReasons,
} from '../../../../../../alerting/common';
import { hasAllPrivilege } from '../../../lib/capabilities';
import { alertsStatusesTranslationsMapping, ALERT_STATUS_LICENSE_ERROR } from '../translations';
import { useKibana } from '../../../../common/lib/kibana';
import { DEFAULT_HIDDEN_ACTION_TYPES } from '../../../../common/constants';
import './alerts_list.scss';
import { CenterJustifiedSpinner } from '../../../components/center_justified_spinner';
import { ManageLicenseModal } from './manage_license_modal';

const ENTER_KEY = 13;

interface AlertTypeState {
  isLoading: boolean;
  isInitialized: boolean;
  data: AlertTypeIndex;
}
interface AlertState {
  isLoading: boolean;
  data: Alert[];
  totalItemCount: number;
}

export const AlertsList: React.FunctionComponent = () => {
  const history = useHistory();
  const {
    http,
    notifications: { toasts },
    application: { capabilities },
    alertTypeRegistry,
    actionTypeRegistry,
    kibanaFeatures,
  } = useKibana().services;
  const canExecuteActions = hasExecuteActionsCapability(capabilities);

  const [actionTypes, setActionTypes] = useState<ActionType[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isPerformingAction, setIsPerformingAction] = useState<boolean>(false);
  const [page, setPage] = useState<Pagination>({ index: 0, size: DEFAULT_SEARCH_PAGE_SIZE });
  const [searchText, setSearchText] = useState<string | undefined>();
  const [inputText, setInputText] = useState<string | undefined>();
  const [typesFilter, setTypesFilter] = useState<string[]>([]);
  const [actionTypesFilter, setActionTypesFilter] = useState<string[]>([]);
  const [alertStatusesFilter, setAlertStatusesFilter] = useState<string[]>([]);
  const [alertFlyoutVisible, setAlertFlyoutVisibility] = useState<boolean>(false);
  const [dismissAlertErrors, setDismissAlertErrors] = useState<boolean>(false);
  const [manageLicenseModalOpts, setManageLicenseModalOpts] = useState<{
    licenseType: string;
    alertTypeId: string;
  } | null>(null);
  const [alertsStatusesTotal, setAlertsStatusesTotal] = useState<Record<string, number>>(
    AlertExecutionStatusValues.reduce(
      (prev: Record<string, number>, status: string) =>
        ({
          ...prev,
          [status]: 0,
        } as Record<string, number>),
      {}
    )
  );
  const [alertTypesState, setAlertTypesState] = useState<AlertTypeState>({
    isLoading: false,
    isInitialized: false,
    data: new Map(),
  });
  const [alertsState, setAlertsState] = useState<AlertState>({
    isLoading: false,
    data: [],
    totalItemCount: 0,
  });
  const [alertsToDelete, setAlertsToDelete] = useState<string[]>([]);

  useEffect(() => {
    loadAlertsData();
  }, [
    alertTypesState,
    page,
    searchText,
    JSON.stringify(typesFilter),
    JSON.stringify(actionTypesFilter),
    JSON.stringify(alertStatusesFilter),
  ]);

  useEffect(() => {
    (async () => {
      try {
        setAlertTypesState({ ...alertTypesState, isLoading: true });
        const alertTypes = await loadAlertTypes({ http });
        const index: AlertTypeIndex = new Map();
        for (const alertType of alertTypes) {
          index.set(alertType.id, alertType);
        }
        setAlertTypesState({ isLoading: false, data: index, isInitialized: true });
      } catch (e) {
        toasts.addDanger({
          title: i18n.translate(
            'xpack.triggersActionsUI.sections.alertsList.unableToLoadAlertTypesMessage',
            { defaultMessage: 'Unable to load alert types' }
          ),
        });
        setAlertTypesState({ ...alertTypesState, isLoading: false });
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const result = await loadActionTypes({ http });
        setActionTypes(
          result
            .filter(
              // TODO: Remove "DEFAULT_HIDDEN_ACTION_TYPES" when cases connector is available across Kibana.
              // Issue: https://github.com/elastic/kibana/issues/82502.
              ({ id }) => actionTypeRegistry.has(id) && !DEFAULT_HIDDEN_ACTION_TYPES.includes(id)
            )
            .sort((a, b) => a.name.localeCompare(b.name))
        );
      } catch (e) {
        toasts.addDanger({
          title: i18n.translate(
            'xpack.triggersActionsUI.sections.alertsList.unableToLoadActionTypesMessage',
            { defaultMessage: 'Unable to load action types' }
          ),
        });
      }
    })();
  }, []);

  async function loadAlertsData() {
    const hasAnyAuthorizedAlertType = alertTypesState.data.size > 0;
    if (hasAnyAuthorizedAlertType) {
      setAlertsState({ ...alertsState, isLoading: true });
      try {
        const alertsResponse = await loadAlerts({
          http,
          page,
          searchText,
          typesFilter,
          actionTypesFilter,
          alertStatusesFilter,
        });
        await loadAlertAggs();
        setAlertsState({
          isLoading: false,
          data: alertsResponse.data,
          totalItemCount: alertsResponse.total,
        });

        if (!alertsResponse.data?.length && page.index > 0) {
          setPage({ ...page, index: 0 });
        }
      } catch (e) {
        toasts.addDanger({
          title: i18n.translate(
            'xpack.triggersActionsUI.sections.alertsList.unableToLoadAlertsMessage',
            {
              defaultMessage: 'Unable to load alerts',
            }
          ),
        });
        setAlertsState({ ...alertsState, isLoading: false });
      }
    }
  }

  async function loadAlertAggs() {
    try {
      const alertsAggs = await loadAlertAggregations({
        http,
        searchText,
        typesFilter,
        actionTypesFilter,
        alertStatusesFilter,
      });
      if (alertsAggs?.alertExecutionStatus) {
        setAlertsStatusesTotal(alertsAggs.alertExecutionStatus);
      }
    } catch (e) {
      toasts.addDanger({
        title: i18n.translate(
          'xpack.triggersActionsUI.sections.alertsList.unableToLoadAlertsStatusesInfoMessage',
          {
            defaultMessage: 'Unable to load alert statuses info',
          }
        ),
      });
    }
  }

  const renderAlertExecutionStatus = (
    executionStatus: AlertExecutionStatus,
    item: AlertTableItem
  ) => {
    const healthColor = getHealthColor(executionStatus.status);
    const tooltipMessage =
      executionStatus.status === 'error' ? `Error: ${executionStatus?.error?.message}` : null;
    const isLicenseError =
      executionStatus.error?.reason === AlertExecutionStatusErrorReasons.License;
    const statusMessage = isLicenseError
      ? ALERT_STATUS_LICENSE_ERROR
      : alertsStatusesTranslationsMapping[executionStatus.status];

    const health = (
      <EuiHealth data-test-subj={`alertStatus-${executionStatus.status}`} color={healthColor}>
        {statusMessage}
      </EuiHealth>
    );

    const healthWithTooltip = tooltipMessage ? (
      <EuiToolTip
        data-test-subj="alertStatus-error-tooltip"
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
              data-test-subj="alertStatus-error-license-fix"
              onClick={() =>
                setManageLicenseModalOpts({
                  licenseType: alertTypesState.data.get(item.alertTypeId)?.minimumLicenseRequired!,
                  alertTypeId: item.alertTypeId,
                })
              }
            >
              <FormattedMessage
                id="xpack.triggersActionsUI.sections.alertsList.fixLicenseLink"
                defaultMessage="Fix"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    );
  };

  const alertsTableColumns = [
    {
      field: 'name',
      name: i18n.translate(
        'xpack.triggersActionsUI.sections.alertsList.alertsListTable.columns.nameTitle',
        { defaultMessage: 'Name' }
      ),
      sortable: false,
      truncateText: true,
      width: '35%',
      'data-test-subj': 'alertsTableCell-name',
      render: (name: string, alert: AlertTableItem) => {
        return (
          <EuiLink
            title={name}
            onClick={() => {
              history.push(routeToAlertDetails.replace(`:alertId`, alert.id));
            }}
          >
            {name}
          </EuiLink>
        );
      },
    },
    {
      field: 'executionStatus',
      name: i18n.translate(
        'xpack.triggersActionsUI.sections.alertsList.alertsListTable.columns.statusTitle',
        { defaultMessage: 'Status' }
      ),
      sortable: false,
      truncateText: false,
      width: '150px',
      'data-test-subj': 'alertsTableCell-status',
      render: (executionStatus: AlertExecutionStatus, item: AlertTableItem) => {
        return renderAlertExecutionStatus(executionStatus, item);
      },
    },
    {
      field: 'tagsText',
      name: i18n.translate(
        'xpack.triggersActionsUI.sections.alertsList.alertsListTable.columns.tagsText',
        { defaultMessage: 'Tags' }
      ),
      sortable: false,
      'data-test-subj': 'alertsTableCell-tagsText',
    },
    {
      field: 'actionsText',
      name: i18n.translate(
        'xpack.triggersActionsUI.sections.alertsList.alertsListTable.columns.actionsText',
        { defaultMessage: 'Actions' }
      ),
      render: (count: number, item: AlertTableItem) => {
        return (
          <EuiBadge color="hollow" key={item.id}>
            {count}
          </EuiBadge>
        );
      },
      sortable: false,
      'data-test-subj': 'alertsTableCell-actionsText',
    },
    {
      field: 'alertType',
      name: i18n.translate(
        'xpack.triggersActionsUI.sections.alertsList.alertsListTable.columns.alertTypeTitle',
        { defaultMessage: 'Type' }
      ),
      sortable: false,
      truncateText: true,
      'data-test-subj': 'alertsTableCell-alertType',
    },
    {
      field: 'schedule.interval',
      name: i18n.translate(
        'xpack.triggersActionsUI.sections.alertsList.alertsListTable.columns.intervalTitle',
        { defaultMessage: 'Runs every' }
      ),
      sortable: false,
      truncateText: false,
      'data-test-subj': 'alertsTableCell-interval',
    },
    {
      name: '',
      width: '40px',
      render(item: AlertTableItem) {
        return (
          <CollapsedItemActions
            key={item.id}
            item={item}
            onAlertChanged={() => loadAlertsData()}
            setAlertsToDelete={setAlertsToDelete}
          />
        );
      },
    },
  ];

  const authorizedAlertTypes = [...alertTypesState.data.values()];
  const authorizedToCreateAnyAlerts = authorizedAlertTypes.some(
    (alertType) => alertType.authorizedConsumers[ALERTS_FEATURE_ID]?.all
  );

  const getProducerFeatureName = (producer: string) => {
    return kibanaFeatures?.find((featureItem) => featureItem.id === producer)?.name;
  };

  const groupAlertTypesByProducer = () => {
    return authorizedAlertTypes.reduce(
      (
        result: Record<
          string,
          Array<{
            value: string;
            name: string;
          }>
        >,
        alertType
      ) => {
        const producer = alertType.producer;
        (result[producer] = result[producer] || []).push({
          value: alertType.id,
          name: alertType.name,
        });
        return result;
      },
      {}
    );
  };

  const toolsRight = [
    <TypeFilter
      key="type-filter"
      onChange={(types: string[]) => setTypesFilter(types)}
      options={sortBy(Object.entries(groupAlertTypesByProducer())).map(
        ([groupName, alertTypesOptions]) => ({
          groupName: getProducerFeatureName(groupName) ?? capitalize(groupName),
          subOptions: alertTypesOptions.sort((a, b) => a.name.localeCompare(b.name)),
        })
      )}
    />,
    <ActionTypeFilter
      key="action-type-filter"
      actionTypes={actionTypes}
      onChange={(ids: string[]) => setActionTypesFilter(ids)}
    />,
    <AlertStatusFilter
      key="alert-status-filter"
      selectedStatuses={alertStatusesFilter}
      onChange={(ids: string[]) => setAlertStatusesFilter(ids)}
    />,
    <EuiButtonEmpty
      data-test-subj="refreshAlertsButton"
      iconType="refresh"
      onClick={loadAlertsData}
      name="refresh"
      color="primary"
    >
      <FormattedMessage
        id="xpack.triggersActionsUI.sections.alertsList.refreshAlertsButtonLabel"
        defaultMessage="Refresh"
      />
    </EuiButtonEmpty>,
  ];

  const authorizedToModifySelectedAlerts = selectedIds.length
    ? filterAlertsById(alertsState.data, selectedIds).every((selectedAlert) =>
        hasAllPrivilege(selectedAlert, alertTypesState.data.get(selectedAlert.alertTypeId))
      )
    : false;

  const table = (
    <Fragment>
      <EuiFlexGroup gutterSize="s">
        {selectedIds.length > 0 && authorizedToModifySelectedAlerts && (
          <EuiFlexItem grow={false}>
            <BulkOperationPopover>
              <AlertQuickEditButtons
                selectedItems={convertAlertsToTableItems(
                  filterAlertsById(alertsState.data, selectedIds),
                  alertTypesState.data,
                  canExecuteActions
                )}
                onPerformingAction={() => setIsPerformingAction(true)}
                onActionPerformed={() => {
                  loadAlertsData();
                  setIsPerformingAction(false);
                }}
                setAlertsToDelete={setAlertsToDelete}
              />
            </BulkOperationPopover>
          </EuiFlexItem>
        )}
        {authorizedToCreateAnyAlerts ? (
          <EuiFlexItem grow={false}>
            <EuiButton
              key="create-alert"
              data-test-subj="createAlertButton"
              fill
              onClick={() => setAlertFlyoutVisibility(true)}
            >
              <FormattedMessage
                id="xpack.triggersActionsUI.sections.alertsList.addActionButtonLabel"
                defaultMessage="Create alert"
              />
            </EuiButton>
          </EuiFlexItem>
        ) : null}
        <EuiFlexItem>
          <EuiFieldSearch
            fullWidth
            isClearable
            data-test-subj="alertSearchField"
            onChange={(e) => setInputText(e.target.value)}
            onKeyUp={(e) => {
              if (e.keyCode === ENTER_KEY) {
                setSearchText(inputText);
              }
            }}
            placeholder={i18n.translate(
              'xpack.triggersActionsUI.sections.alertsList.searchPlaceholderTitle',
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
      {!dismissAlertErrors && alertsStatusesTotal.error > 0 ? (
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiCallOut
              color="danger"
              size="s"
              title={
                <FormattedMessage
                  id="xpack.triggersActionsUI.sections.alertsList.attentionBannerTitle"
                  defaultMessage="Error found in {totalStausesError, plural, one {# alert} other {# alerts}}."
                  values={{
                    totalStausesError: alertsStatusesTotal.error,
                  }}
                />
              }
              iconType="alert"
              data-test-subj="alertsErrorBanner"
            >
              <EuiButton
                type="primary"
                size="s"
                color="danger"
                onClick={() => setAlertStatusesFilter(['error'])}
              >
                <FormattedMessage
                  id="xpack.triggersActionsUI.sections.alertsList.viewBunnerButtonLabel"
                  defaultMessage="View"
                />
              </EuiButton>
              <EuiButtonEmpty color="danger" onClick={() => setDismissAlertErrors(true)}>
                <FormattedMessage
                  id="xpack.triggersActionsUI.sections.alertsList.dismissBunnerButtonLabel"
                  defaultMessage="Dismiss"
                />
              </EuiButtonEmpty>
            </EuiCallOut>
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : null}
      <EuiSpacer size="m" />
      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <EuiText size="s" color="subdued" data-test-subj="totalAlertsCount">
            <FormattedMessage
              id="xpack.triggersActionsUI.sections.alertsList.totalItemsCountDescription"
              defaultMessage="Showing: {pageSize} of {totalItemCount} alerts."
              values={{
                totalItemCount: alertsState.totalItemCount,
                pageSize: alertsState.data.length,
              }}
            />
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiHealth color="primary" data-test-subj="totalActiveAlertsCount">
            <FormattedMessage
              id="xpack.triggersActionsUI.sections.alertsList.totalStausesActiveDescription"
              defaultMessage="Active: {totalStausesActive}"
              values={{
                totalStausesActive: alertsStatusesTotal.active,
              }}
            />
          </EuiHealth>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiHealth color="danger" data-test-subj="totalErrorAlertsCount">
            <FormattedMessage
              id="xpack.triggersActionsUI.sections.alertsList.totalStausesErrorDescription"
              defaultMessage="Error: {totalStausesError}"
              values={{ totalStausesError: alertsStatusesTotal.error }}
            />
          </EuiHealth>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiHealth color="subdued" data-test-subj="totalOkAlertsCount">
            <FormattedMessage
              id="xpack.triggersActionsUI.sections.alertsList.totalStausesOkDescription"
              defaultMessage="Ok: {totalStausesOk}"
              values={{ totalStausesOk: alertsStatusesTotal.ok }}
            />
          </EuiHealth>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiHealth color="success" data-test-subj="totalPendingAlertsCount">
            <FormattedMessage
              id="xpack.triggersActionsUI.sections.alertsList.totalStausesPendingDescription"
              defaultMessage="Pending: {totalStausesPending}"
              values={{
                totalStausesPending: alertsStatusesTotal.pending,
              }}
            />
          </EuiHealth>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiHealth color="warning" data-test-subj="totalUnknownAlertsCount">
            <FormattedMessage
              id="xpack.triggersActionsUI.sections.alertsList.totalStausesUnknownDescription"
              defaultMessage="Unknown: {totalStausesUnknown}"
              values={{
                totalStausesUnknown: alertsStatusesTotal.unknown,
              }}
            />
          </EuiHealth>
        </EuiFlexItem>
      </EuiFlexGroup>
      {/* Large to remain consistent with ActionsList table spacing */}
      <EuiSpacer size="l" />

      <EuiBasicTable
        loading={alertsState.isLoading || alertTypesState.isLoading || isPerformingAction}
        /* Don't display alerts until we have the alert types initialized */
        items={
          alertTypesState.isInitialized === false
            ? []
            : convertAlertsToTableItems(alertsState.data, alertTypesState.data, canExecuteActions)
        }
        itemId="id"
        columns={alertsTableColumns}
        rowProps={(item: AlertTableItem) => ({
          'data-test-subj': 'alert-row',
          className: !alertTypesState.data.get(item.alertTypeId)?.enabledInLicense
            ? 'actAlertsList__tableRowDisabled'
            : '',
        })}
        cellProps={(item: AlertTableItem) => ({
          'data-test-subj': 'cell',
          className: !alertTypesState.data.get(item.alertTypeId)?.enabledInLicense
            ? 'actAlertsList__tableCellDisabled'
            : '',
        })}
        data-test-subj="alertsList"
        pagination={{
          pageIndex: page.index,
          pageSize: page.size,
          /* Don't display alert count until we have the alert types initialized */
          totalItemCount: alertTypesState.isInitialized === false ? 0 : alertsState.totalItemCount,
        }}
        selection={{
          selectable: (alert: AlertTableItem) => alert.isEditable,
          onSelectionChange(updatedSelectedItemsList: AlertTableItem[]) {
            setSelectedIds(updatedSelectedItemsList.map((item) => item.id));
          },
        }}
        onChange={({ page: changedPage }: { page: Pagination }) => {
          setPage(changedPage);
        }}
      />
      {manageLicenseModalOpts && (
        <ManageLicenseModal
          licenseType={manageLicenseModalOpts.licenseType}
          alertTypeId={manageLicenseModalOpts.alertTypeId}
          onConfirm={() => {
            window.open(`${http.basePath.get()}/app/management/stack/license_management`, '_blank');
            setManageLicenseModalOpts(null);
          }}
          onCancel={() => setManageLicenseModalOpts(null)}
        />
      )}
    </Fragment>
  );

  const loadedItems = convertAlertsToTableItems(
    alertsState.data,
    alertTypesState.data,
    canExecuteActions
  );

  const isFilterApplied = !(
    isEmpty(searchText) &&
    isEmpty(typesFilter) &&
    isEmpty(actionTypesFilter) &&
    isEmpty(alertStatusesFilter)
  );

  return (
    <section data-test-subj="alertsList">
      <DeleteModalConfirmation
        onDeleted={async () => {
          setAlertsToDelete([]);
          setSelectedIds([]);
          await loadAlertsData();
        }}
        onErrors={async () => {
          // Refresh the alerts from the server, some alerts may have beend deleted
          await loadAlertsData();
          setAlertsToDelete([]);
        }}
        onCancel={() => {
          setAlertsToDelete([]);
        }}
        apiDeleteCall={deleteAlerts}
        idsToDelete={alertsToDelete}
        singleTitle={i18n.translate('xpack.triggersActionsUI.sections.alertsList.singleTitle', {
          defaultMessage: 'alert',
        })}
        multipleTitle={i18n.translate('xpack.triggersActionsUI.sections.alertsList.multipleTitle', {
          defaultMessage: 'alerts',
        })}
        setIsLoadingState={(isLoading: boolean) => {
          setAlertsState({ ...alertsState, isLoading });
        }}
      />
      <EuiSpacer size="m" />
      {loadedItems.length || isFilterApplied ? (
        table
      ) : alertTypesState.isLoading || alertsState.isLoading ? (
        <CenterJustifiedSpinner />
      ) : authorizedToCreateAnyAlerts ? (
        <EmptyPrompt onCTAClicked={() => setAlertFlyoutVisibility(true)} />
      ) : (
        noPermissionPrompt
      )}
      {alertFlyoutVisible && (
        <AlertAdd
          consumer={ALERTS_FEATURE_ID}
          onClose={() => {
            setAlertFlyoutVisibility(false);
          }}
          actionTypeRegistry={actionTypeRegistry}
          alertTypeRegistry={alertTypeRegistry}
          onSave={loadAlertsData}
        />
      )}
    </section>
  );
};

const noPermissionPrompt = (
  <EuiEmptyPrompt
    iconType="securityApp"
    title={
      <h1>
        <FormattedMessage
          id="xpack.triggersActionsUI.sections.alertsList.noPermissionToCreateTitle"
          defaultMessage="No permissions to create alerts"
        />
      </h1>
    }
    body={
      <p data-test-subj="permissionDeniedMessage">
        <FormattedMessage
          id="xpack.triggersActionsUI.sections.alertsList.noPermissionToCreateDescription"
          defaultMessage="Contact your system administrator."
        />
      </p>
    }
  />
);

function filterAlertsById(alerts: Alert[], ids: string[]): Alert[] {
  return alerts.filter((alert) => ids.includes(alert.id));
}

function convertAlertsToTableItems(
  alerts: Alert[],
  alertTypesIndex: AlertTypeIndex,
  canExecuteActions: boolean
) {
  return alerts.map((alert) => ({
    ...alert,
    actionsText: alert.actions.length,
    tagsText: alert.tags.join(', '),
    alertType: alertTypesIndex.get(alert.alertTypeId)?.name ?? alert.alertTypeId,
    isEditable:
      hasAllPrivilege(alert, alertTypesIndex.get(alert.alertTypeId)) &&
      (canExecuteActions || (!canExecuteActions && !alert.actions.length)),
    enabledInLicense: !!alertTypesIndex.get(alert.alertTypeId)?.enabledInLicense,
  }));
}
