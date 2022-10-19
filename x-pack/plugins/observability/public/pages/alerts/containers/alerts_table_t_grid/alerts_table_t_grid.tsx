/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * We need to produce types and code transpilation at different folders during the build of the package.
 * We have types and code at different imports because we don't want to import the whole package in the resulting webpack bundle for the plugin.
 * This way plugins can do targeted imports to reduce the final code bundle
 */
import {
  ALERT_DURATION,
  ALERT_EVALUATION_THRESHOLD,
  ALERT_EVALUATION_VALUE,
  ALERT_REASON,
  ALERT_RULE_CATEGORY,
  ALERT_RULE_NAME,
  ALERT_STATUS,
  ALERT_UUID,
  TIMESTAMP,
  ALERT_START,
} from '@kbn/rule-data-utils';

import { EuiDataGridColumn, EuiFlexGroup } from '@elastic/eui';

import { IStorageWrapper } from '@kbn/kibana-utils-plugin/public';

import styled from 'styled-components';
import React, { Suspense, useMemo, useState, useCallback, useEffect } from 'react';

import { pick } from 'lodash';
import type {
  TGridType,
  TGridState,
  TGridModel,
  SortDirection,
} from '@kbn/timelines-plugin/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type {
  ActionProps,
  ColumnHeaderOptions,
  ControlColumnProps,
  RowRenderer,
} from '@kbn/timelines-plugin/common';
import { getAlertsPermissions } from '../../../../hooks/use_alert_permission';

import type { TopAlert } from '../alerts_page/types';

import { getRenderCellValue } from '../../components/render_cell_value';
import { observabilityAppId, observabilityFeatureId } from '../../../../../common';
import { useGetUserCasesPermissions } from '../../../../hooks/use_get_user_cases_permissions';
import { usePluginContext } from '../../../../hooks/use_plugin_context';
import { LazyAlertsFlyout } from '../../../..';
import { translations } from '../../../../config';
import { addDisplayNames } from './add_display_names';
import { ObservabilityAppServices } from '../../../../application/types';
import { useBulkAddToCaseActions } from '../../../../hooks/use_alert_bulk_case_actions';
import {
  ObservabilityActions,
  ObservabilityActionsProps,
} from '../../components/observability_actions';

interface AlertsTableTGridProps {
  indexNames: string[];
  rangeFrom: string;
  rangeTo: string;
  kuery?: string;
  stateStorageKey: string;
  storage: IStorageWrapper;
  setRefetch: (ref: () => void) => void;
  itemsPerPage?: number;
}

const EventsThContent = styled.div.attrs(({ className = '' }) => ({
  className: `siemEventsTable__thContent ${className}`,
}))<{ textAlign?: string; width?: number }>`
  font-size: ${({ theme }) => theme.eui.euiFontSizeXS};
  font-weight: ${({ theme }) => theme.eui.euiFontWeightBold};
  line-height: ${({ theme }) => theme.eui.euiLineHeight};
  min-width: 0;
  padding: ${({ theme }) => theme.eui.euiSizeXS};
  text-align: ${({ textAlign }) => textAlign};
  width: ${({ width }) =>
    width != null
      ? `${width}px`
      : '100%'}; /* Using width: 100% instead of flex: 1 and max-width: 100% for IE11 */

  > button.euiButtonIcon,
  > .euiToolTipAnchor > button.euiButtonIcon {
    margin-left: ${({ theme }) => `-${theme.eui.euiSizeXS}`};
  }
`;
/**
 * columns implements a subset of `EuiDataGrid`'s `EuiDataGridColumn` interface,
 * plus additional TGrid column properties
 */
export const columns: Array<
  Pick<EuiDataGridColumn, 'display' | 'displayAsText' | 'id' | 'initialWidth'> & ColumnHeaderOptions
> = [
  {
    columnHeaderType: 'not-filtered',
    displayAsText: translations.alertsTable.statusColumnDescription,
    id: ALERT_STATUS,
    initialWidth: 110,
  },
  {
    columnHeaderType: 'not-filtered',
    displayAsText: translations.alertsTable.lastUpdatedColumnDescription,
    id: TIMESTAMP,
    initialWidth: 230,
  },
  {
    columnHeaderType: 'not-filtered',
    displayAsText: translations.alertsTable.durationColumnDescription,
    id: ALERT_DURATION,
    initialWidth: 116,
  },
  {
    columnHeaderType: 'not-filtered',
    displayAsText: translations.alertsTable.reasonColumnDescription,
    id: ALERT_REASON,
    linkField: '*',
  },
];

const NO_ROW_RENDER: RowRenderer[] = [];

const trailingControlColumns: never[] = [];

const FIELDS_WITHOUT_CELL_ACTIONS = [
  '@timestamp',
  'signal.rule.risk_score',
  'signal.reason',
  'kibana.alert.duration.us',
  'kibana.alert.reason',
];

export function AlertsTableTGrid(props: AlertsTableTGridProps) {
  const {
    indexNames,
    rangeFrom,
    rangeTo,
    kuery,
    setRefetch,
    stateStorageKey,
    storage,
    itemsPerPage,
  } = props;

  const {
    timelines,
    application: { capabilities },
  } = useKibana<ObservabilityAppServices>().services;
  const { observabilityRuleTypeRegistry, config } = usePluginContext();

  const [flyoutAlert, setFlyoutAlert] = useState<TopAlert | undefined>(undefined);
  const [tGridState, setTGridState] = useState<Partial<TGridModel> | null>(
    storage.get(stateStorageKey)
  );

  const userCasesPermissions = useGetUserCasesPermissions();

  const hasAlertsCrudPermissions = useCallback(
    ({ ruleConsumer, ruleProducer }: { ruleConsumer: string; ruleProducer?: string }) => {
      if (ruleConsumer === 'alerts' && ruleProducer) {
        return getAlertsPermissions(capabilities, ruleProducer).crud;
      }
      return getAlertsPermissions(capabilities, ruleConsumer).crud;
    },
    [capabilities]
  );

  const [deletedEventIds, setDeletedEventIds] = useState<string[]>([]);

  useEffect(() => {
    if (tGridState) {
      const newState = {
        ...tGridState,
        columns: tGridState.columns?.map((c) =>
          pick(c, ['columnHeaderType', 'displayAsText', 'id', 'initialWidth', 'linkField'])
        ),
      };
      if (newState !== storage.get(stateStorageKey)) {
        storage.set(stateStorageKey, newState);
      }
    }
  }, [tGridState, stateStorageKey, storage]);

  const setEventsDeleted = useCallback<ObservabilityActionsProps['setEventsDeleted']>((action) => {
    if (action.isDeleted) {
      setDeletedEventIds((ids) => [...ids, ...action.eventIds]);
    }
  }, []);

  const leadingControlColumns: ControlColumnProps[] = useMemo(() => {
    return [
      {
        id: 'expand',
        width: 120,
        headerCellRender: () => {
          return <EventsThContent>{translations.alertsTable.actionsTextLabel}</EventsThContent>;
        },
        rowCellRender: (actionProps: ActionProps) => {
          return (
            <EuiFlexGroup gutterSize="none" responsive={false}>
              <ObservabilityActions
                {...actionProps}
                setEventsDeleted={setEventsDeleted}
                setFlyoutAlert={setFlyoutAlert}
                observabilityRuleTypeRegistry={observabilityRuleTypeRegistry}
                config={config}
              />
            </EuiFlexGroup>
          );
        },
      },
    ];
  }, [setEventsDeleted, observabilityRuleTypeRegistry, config]);

  const onStateChange = useCallback(
    (state: TGridState) => {
      const pickedState = pick(state.tableById['standalone-t-grid'], [
        'columns',
        'sort',
        'selectedEventIds',
      ]);
      if (JSON.stringify(pickedState) !== JSON.stringify(tGridState)) {
        setTGridState(pickedState);
      }
    },
    [tGridState]
  );

  const addToCaseBulkActions = useBulkAddToCaseActions();
  const bulkActions = useMemo(
    () => ({
      alertStatusActions: false,
      customBulkActions: addToCaseBulkActions,
    }),
    [addToCaseBulkActions]
  );
  const tGridProps = useMemo(() => {
    const type: TGridType = 'standalone';
    const sortDirection: SortDirection = 'desc';
    return {
      appId: observabilityAppId,
      casesOwner: observabilityFeatureId,
      casePermissions: userCasesPermissions,
      type,
      columns: (tGridState?.columns ?? columns).map(addDisplayNames),
      deletedEventIds,
      disabledCellActions: FIELDS_WITHOUT_CELL_ACTIONS,
      end: rangeTo,
      filters: [],
      hasAlertsCrudPermissions,
      indexNames,
      itemsPerPage,
      itemsPerPageOptions: [10, 25, 50],
      loadingText: translations.alertsTable.loadingTextLabel,
      onStateChange,
      query: {
        query: kuery ?? '',
        language: 'kuery',
      },
      renderCellValue: getRenderCellValue({ setFlyoutAlert, observabilityRuleTypeRegistry }),
      rowRenderers: NO_ROW_RENDER,
      // TODO: implement Kibana data view runtime fields in observability
      runtimeMappings: {},
      start: rangeFrom,
      setRefetch,
      bulkActions,
      sort: tGridState?.sort ?? [
        {
          columnId: '@timestamp',
          columnType: 'date',
          sortDirection,
        },
      ],
      queryFields: [
        ALERT_DURATION,
        ALERT_EVALUATION_THRESHOLD,
        ALERT_EVALUATION_VALUE,
        ALERT_REASON,
        ALERT_RULE_CATEGORY,
        ALERT_RULE_NAME,
        ALERT_STATUS,
        ALERT_UUID,
        ALERT_START,
        TIMESTAMP,
      ],
      leadingControlColumns,
      trailingControlColumns,
      unit: (totalAlerts: number) => translations.alertsTable.showingAlertsTitle(totalAlerts),
    };
  }, [
    userCasesPermissions,
    tGridState?.columns,
    tGridState?.sort,
    deletedEventIds,
    rangeTo,
    hasAlertsCrudPermissions,
    indexNames,
    itemsPerPage,
    observabilityRuleTypeRegistry,
    onStateChange,
    kuery,
    rangeFrom,
    setRefetch,
    bulkActions,
    leadingControlColumns,
  ]);

  const handleFlyoutClose = () => setFlyoutAlert(undefined);

  return (
    <>
      {flyoutAlert && (
        <Suspense fallback={null}>
          <LazyAlertsFlyout
            alert={flyoutAlert}
            observabilityRuleTypeRegistry={observabilityRuleTypeRegistry}
            onClose={handleFlyoutClose}
          />
        </Suspense>
      )}
      {timelines.getTGrid<'standalone'>(tGridProps)}
    </>
  );
}
