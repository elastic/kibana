/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiDataGridColumn } from '@elastic/eui';
import { EuiButtonIcon, EuiContextMenu, EuiFlexGroup, EuiFlexItem, EuiPopover } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  ALERT_DURATION as ALERT_DURATION_TYPED,
  ALERT_REASON as ALERT_REASON_TYPED,
  ALERT_RULE_CONSUMER,
  ALERT_STATUS as ALERT_STATUS_TYPED,
  ALERT_WORKFLOW_STATUS as ALERT_WORKFLOW_STATUS_TYPED,
} from '@kbn/rule-data-utils';
import {
  ALERT_DURATION as ALERT_DURATION_NON_TYPED,
  ALERT_REASON as ALERT_REASON_NON_TYPED,
  ALERT_STATUS as ALERT_STATUS_NON_TYPED,
  ALERT_WORKFLOW_STATUS as ALERT_WORKFLOW_STATUS_NON_TYPED,
  TIMESTAMP,
  // @ts-expect-error importing from a place other than root because we want to limit what we import from this package
} from '@kbn/rule-data-utils/target_node/technical_field_names';
import { get } from 'lodash';
import React, { Suspense, useCallback, useMemo, useState } from 'react';
import styled from 'styled-components';
import type { TopAlert } from '.';
import { LazyAlertsFlyout } from '../..';
import type { CoreStart } from '../../../../../../src/core/public/types';
import { useKibana } from '../../../../../../src/plugins/kibana_react/public/context/context';
import type {
  ActionProps,
  AlertWorkflowStatus,
} from '../../../../timelines/common/types/timeline/actions';
import type { ColumnHeaderOptions } from '../../../../timelines/common/types/timeline/columns';
import type { RowRenderer } from '../../../../timelines/common/types/timeline/rows';
import type { SortDirection } from '../../../../timelines/common/types/timeline/store';
import { useStatusBulkActionItems } from '../../../../timelines/public/hooks/use_status_bulk_action_items';
import type { TGridType, TimelinesUIStart } from '../../../../timelines/public/types';
import { observabilityFeatureId } from '../../../common';
import { useGetUserAlertsPermissions } from '../../hooks/use_alert_permission';
import { useGetUserCasesPermissions } from '../../hooks/use_get_user_cases_permissions';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { getDefaultCellActions } from './default_cell_actions';
import { parseAlert } from './parse_alert';
import { getRenderCellValue } from './render_cell_value';

const ALERT_DURATION: typeof ALERT_DURATION_TYPED = ALERT_DURATION_NON_TYPED;
const ALERT_REASON: typeof ALERT_REASON_TYPED = ALERT_REASON_NON_TYPED;
const ALERT_STATUS: typeof ALERT_STATUS_TYPED = ALERT_STATUS_NON_TYPED;
const ALERT_WORKFLOW_STATUS: typeof ALERT_WORKFLOW_STATUS_TYPED = ALERT_WORKFLOW_STATUS_NON_TYPED;

interface AlertsTableTGridProps {
  indexNames: string[];
  rangeFrom: string;
  rangeTo: string;
  kuery: string;
  workflowStatus: AlertWorkflowStatus;
  setRefetch: (ref: () => void) => void;
  addToQuery: (value: string) => void;
}

interface ObservabilityActionsProps extends ActionProps {
  currentStatus: AlertWorkflowStatus;
  setFlyoutAlert: React.Dispatch<React.SetStateAction<TopAlert | undefined>>;
}

const EventsThContent = styled.div.attrs(({ className = '' }) => ({
  className: `siemEventsTable__thContent ${className}`,
}))<{ textAlign?: string; width?: number }>`
  font-size: ${({ theme }) => theme.eui.euiFontSizeXS};
  font-weight: ${({ theme }) => theme.eui.euiFontWeightBold};
  line-height: ${({ theme }) => theme.eui.euiLineHeight};
  min-width: 0;
  padding: ${({ theme }) => theme.eui.paddingSizes.xs};
  text-align: ${({ textAlign }) => textAlign};
  width: ${({ width }) =>
    width != null
      ? `${width}px`
      : '100%'}; /* Using width: 100% instead of flex: 1 and max-width: 100% for IE11 */

  > button.euiButtonIcon,
  > .euiToolTipAnchor > button.euiButtonIcon {
    margin-left: ${({ theme }) => `-${theme.eui.paddingSizes.xs}`};
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
    displayAsText: i18n.translate('xpack.observability.alertsTGrid.statusColumnDescription', {
      defaultMessage: 'Alert Status',
    }),
    id: ALERT_STATUS,
    initialWidth: 110,
  },
  {
    columnHeaderType: 'not-filtered',
    displayAsText: i18n.translate('xpack.observability.alertsTGrid.lastUpdatedColumnDescription', {
      defaultMessage: 'Last updated',
    }),
    id: TIMESTAMP,
    initialWidth: 230,
  },
  {
    columnHeaderType: 'not-filtered',
    displayAsText: i18n.translate('xpack.observability.alertsTGrid.durationColumnDescription', {
      defaultMessage: 'Duration',
    }),
    id: ALERT_DURATION,
    initialWidth: 116,
  },
  {
    columnHeaderType: 'not-filtered',
    displayAsText: i18n.translate('xpack.observability.alertsTGrid.reasonColumnDescription', {
      defaultMessage: 'Reason',
    }),
    id: ALERT_REASON,
    linkField: '*',
  },
];

const NO_ROW_RENDER: RowRenderer[] = [];

const trailingControlColumns: never[] = [];

function ObservabilityActions({
  data,
  eventId,
  ecsData,
  currentStatus,
  refetch,
  setFlyoutAlert,
  setEventsLoading,
  setEventsDeleted,
}: ObservabilityActionsProps) {
  const { core, observabilityRuleTypeRegistry } = usePluginContext();
  const dataFieldEs = data.reduce((acc, d) => ({ ...acc, [d.field]: d.value }), {});
  const [openActionsPopoverId, setActionsPopover] = useState(null);
  const {
    timelines,
    application: { capabilities },
  } = useKibana<CoreStart & { timelines: TimelinesUIStart }>().services;

  const parseObservabilityAlert = useMemo(() => parseAlert(observabilityRuleTypeRegistry), [
    observabilityRuleTypeRegistry,
  ]);
  const alertDataConsumer = useMemo<string>(() => get(dataFieldEs, ALERT_RULE_CONSUMER, [''])[0], [
    dataFieldEs,
  ]);

  const alert = parseObservabilityAlert(dataFieldEs);
  const { prepend } = core.http.basePath;

  const afterCaseSelection = useCallback(() => {
    setActionsPopover(null);
  }, []);

  const closeActionsPopover = useCallback(() => {
    setActionsPopover(null);
  }, []);

  const toggleActionsPopover = useCallback((id) => {
    setActionsPopover((current) => (current ? null : id));
  }, []);
  const casePermissions = useGetUserCasesPermissions();
  const event = useMemo(() => {
    return {
      data,
      _id: eventId,
      ecs: ecsData,
    };
  }, [data, eventId, ecsData]);

  const onAlertStatusUpdated = useCallback(() => {
    setActionsPopover(null);
    if (refetch) {
      refetch();
    }
  }, [setActionsPopover, refetch]);

  const alertPermissions = useGetUserAlertsPermissions(capabilities, alertDataConsumer);

  const statusActionItems = useStatusBulkActionItems({
    eventIds: [eventId],
    currentStatus,
    indexName: ecsData._index ?? '',
    setEventsLoading,
    setEventsDeleted,
    onUpdateSuccess: onAlertStatusUpdated,
    onUpdateFailure: onAlertStatusUpdated,
  });

  const actionsPanels = useMemo(() => {
    return [
      {
        id: 0,
        content: [
          timelines.getAddToExistingCaseButton({
            event,
            casePermissions,
            appId: observabilityFeatureId,
            onClose: afterCaseSelection,
          }),
          timelines.getAddToNewCaseButton({
            event,
            casePermissions,
            appId: observabilityFeatureId,
            onClose: afterCaseSelection,
          }),
          ...(alertPermissions.crud ? statusActionItems : []),
        ],
      },
    ];
  }, [afterCaseSelection, casePermissions, timelines, event, statusActionItems, alertPermissions]);

  return (
    <>
      <EuiFlexGroup gutterSize="none" responsive={false}>
        <EuiFlexItem>
          <EuiButtonIcon
            size="s"
            iconType="expand"
            color="text"
            onClick={() => setFlyoutAlert(alert)}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiButtonIcon
            size="s"
            href={prepend(alert.link ?? '')}
            iconType="eye"
            color="text"
            aria-label="View alert in app"
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiPopover
            button={
              <EuiButtonIcon
                display="empty"
                size="s"
                color="text"
                iconType="boxesHorizontal"
                aria-label="More"
                onClick={() => toggleActionsPopover(eventId)}
              />
            }
            isOpen={openActionsPopoverId === eventId}
            closePopover={closeActionsPopover}
            panelPaddingSize="none"
            anchorPosition="downLeft"
          >
            <EuiContextMenu panels={actionsPanels} initialPanelId={0} />
          </EuiPopover>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
}

export function AlertsTableTGrid(props: AlertsTableTGridProps) {
  const { indexNames, rangeFrom, rangeTo, kuery, workflowStatus, setRefetch, addToQuery } = props;
  const { timelines } = useKibana<{ timelines: TimelinesUIStart }>().services;

  const [flyoutAlert, setFlyoutAlert] = useState<TopAlert | undefined>(undefined);

  const casePermissions = useGetUserCasesPermissions();

  const leadingControlColumns = useMemo(() => {
    return [
      {
        id: 'expand',
        width: 96,
        headerCellRender: () => {
          return (
            <EventsThContent>
              {i18n.translate('xpack.observability.alertsTable.actionsTextLabel', {
                defaultMessage: 'Actions',
              })}
            </EventsThContent>
          );
        },
        rowCellRender: (actionProps: ActionProps) => {
          return (
            <ObservabilityActions
              {...actionProps}
              currentStatus={workflowStatus}
              setFlyoutAlert={setFlyoutAlert}
            />
          );
        },
      },
    ];
  }, [workflowStatus]);

  const tGridProps = useMemo(() => {
    const type: TGridType = 'standalone';
    const sortDirection: SortDirection = 'desc';
    return {
      appId: observabilityFeatureId,
      casePermissions,
      type,
      columns,
      deletedEventIds: [],
      defaultCellActions: getDefaultCellActions({ addToQuery }),
      end: rangeTo,
      filters: [],
      indexNames,
      itemsPerPage: 10,
      itemsPerPageOptions: [10, 25, 50],
      loadingText: i18n.translate('xpack.observability.alertsTable.loadingTextLabel', {
        defaultMessage: 'loading alerts',
      }),
      footerText: i18n.translate('xpack.observability.alertsTable.footerTextLabel', {
        defaultMessage: 'alerts',
      }),
      query: {
        query: `${ALERT_WORKFLOW_STATUS}: ${workflowStatus}${kuery !== '' ? ` and ${kuery}` : ''}`,
        language: 'kuery',
      },
      renderCellValue: getRenderCellValue({ rangeFrom, rangeTo, setFlyoutAlert }),
      rowRenderers: NO_ROW_RENDER,
      start: rangeFrom,
      setRefetch,
      sort: [
        {
          columnId: '@timestamp',
          columnType: 'date',
          sortDirection,
        },
      ],
      filterStatus: workflowStatus as AlertWorkflowStatus,
      leadingControlColumns,
      trailingControlColumns,
      unit: (totalAlerts: number) =>
        i18n.translate('xpack.observability.alertsTable.showingAlertsTitle', {
          values: { totalAlerts },
          defaultMessage: '{totalAlerts, plural, =1 {alert} other {alerts}}',
        }),
    };
  }, [
    casePermissions,
    indexNames,
    kuery,
    leadingControlColumns,
    rangeFrom,
    rangeTo,
    setRefetch,
    workflowStatus,
    addToQuery,
  ]);
  const handleFlyoutClose = () => setFlyoutAlert(undefined);
  const { observabilityRuleTypeRegistry } = usePluginContext();

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
