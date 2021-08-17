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
import type {
  AlertConsumers as AlertConsumersTyped,
  ALERT_DURATION as ALERT_DURATION_TYPED,
  ALERT_SEVERITY_LEVEL as ALERT_SEVERITY_LEVEL_TYPED,
  ALERT_STATUS as ALERT_STATUS_TYPED,
  ALERT_RULE_NAME as ALERT_RULE_NAME_TYPED,
} from '@kbn/rule-data-utils';
import {
  ALERT_DURATION as ALERT_DURATION_NON_TYPED,
  ALERT_SEVERITY_LEVEL as ALERT_SEVERITY_LEVEL_NON_TYPED,
  ALERT_STATUS as ALERT_STATUS_NON_TYPED,
  ALERT_RULE_NAME as ALERT_RULE_NAME_NON_TYPED,
  TIMESTAMP,
  // @ts-expect-error importing from a place other than root because we want to limit what we import from this package
} from '@kbn/rule-data-utils/target_node/technical_field_names';

// @ts-expect-error importing from a place other than root because we want to limit what we import from this package
import { AlertConsumers as AlertConsumersNonTyped } from '@kbn/rule-data-utils/target_node/alerts_as_data_rbac';

import {
  EuiButtonIcon,
  EuiDataGridColumn,
  EuiFlexGroup,
  EuiFlexItem,
  EuiContextMenu,
  EuiPopover,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import styled from 'styled-components';
import React, { Suspense, useMemo, useState, useCallback } from 'react';

import type { TimelinesUIStart, TGridType, SortDirection } from '../../../../timelines/public';
import type { TopAlert } from './';
import { useKibana } from '../../../../../../src/plugins/kibana_react/public';
import type {
  ActionProps,
  AlertStatus,
  ColumnHeaderOptions,
  RowRenderer,
} from '../../../../timelines/common';

import { getRenderCellValue } from './render_cell_value';
import { observabilityFeatureId } from '../../../common';
import { useGetUserCasesPermissions } from '../../hooks/use_get_user_cases_permissions';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { getDefaultCellActions } from './default_cell_actions';
import { LazyAlertsFlyout } from '../..';
import { parseAlert } from './parse_alert';

const AlertConsumers: typeof AlertConsumersTyped = AlertConsumersNonTyped;
const ALERT_DURATION: typeof ALERT_DURATION_TYPED = ALERT_DURATION_NON_TYPED;
const ALERT_SEVERITY_LEVEL: typeof ALERT_SEVERITY_LEVEL_TYPED = ALERT_SEVERITY_LEVEL_NON_TYPED;
const ALERT_STATUS: typeof ALERT_STATUS_TYPED = ALERT_STATUS_NON_TYPED;
const ALERT_RULE_NAME: typeof ALERT_RULE_NAME_TYPED = ALERT_RULE_NAME_NON_TYPED;

interface AlertsTableTGridProps {
  indexName: string;
  rangeFrom: string;
  rangeTo: string;
  kuery: string;
  status: string;
  setRefetch: (ref: () => void) => void;
}

interface ObservabilityActionsProps extends ActionProps {
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
      defaultMessage: 'Status',
    }),
    id: ALERT_STATUS,
    initialWidth: 79,
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
    displayAsText: i18n.translate('xpack.observability.alertsTGrid.severityColumnDescription', {
      defaultMessage: 'Severity',
    }),
    id: ALERT_SEVERITY_LEVEL,
    initialWidth: 102,
  },
  {
    columnHeaderType: 'not-filtered',
    displayAsText: i18n.translate('xpack.observability.alertsTGrid.reasonColumnDescription', {
      defaultMessage: 'Reason',
    }),
    linkField: '*',
    id: ALERT_RULE_NAME,
  },
];

const NO_ROW_RENDER: RowRenderer[] = [];

const trailingControlColumns: never[] = [];

const OBSERVABILITY_ALERT_CONSUMERS = [
  AlertConsumers.APM,
  AlertConsumers.LOGS,
  AlertConsumers.INFRASTRUCTURE,
  AlertConsumers.UPTIME,
];

function ObservabilityActions({
  data,
  eventId,
  ecsData,
  setFlyoutAlert,
}: ObservabilityActionsProps) {
  const { core, observabilityRuleTypeRegistry } = usePluginContext();
  const dataFieldEs = data.reduce((acc, d) => ({ ...acc, [d.field]: d.value }), {});
  const [openActionsPopoverId, setActionsPopover] = useState(null);
  const { timelines } = useKibana<{ timelines: TimelinesUIStart }>().services;
  const parseObservabilityAlert = useMemo(() => parseAlert(observabilityRuleTypeRegistry), [
    observabilityRuleTypeRegistry,
  ]);
  const alert = parseObservabilityAlert(dataFieldEs);
  const { prepend } = core.http.basePath;

  const afterCaseSelection = useCallback(() => {
    setActionsPopover(null);
  }, []);

  const closeActionsPopover = useCallback(() => {
    setActionsPopover(null);
  }, []);

  const openActionsPopover = useCallback((id) => {
    setActionsPopover(id);
  }, []);
  const casePermissions = useGetUserCasesPermissions();
  const event = useMemo(() => {
    return {
      data,
      _id: eventId,
      ecs: ecsData,
    };
  }, [data, eventId, ecsData]);

  const actionsPanels = useMemo(() => {
    return [
      {
        id: 0,
        content: [
          <>
            {timelines.getAddToExistingCaseButton({
              event,
              casePermissions,
              appId: observabilityFeatureId,
              onClose: afterCaseSelection,
            })}
          </>,
          <>
            {timelines.getAddToNewCaseButton({
              event,
              casePermissions,
              appId: observabilityFeatureId,
              onClose: afterCaseSelection,
            })}
          </>,
        ],
      },
    ];
  }, [afterCaseSelection, casePermissions, timelines, event]);
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
                onClick={() => openActionsPopover(eventId)}
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
  const { indexName, rangeFrom, rangeTo, kuery, status, setRefetch } = props;
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
          return <ObservabilityActions {...actionProps} setFlyoutAlert={setFlyoutAlert} />;
        },
      },
    ];
  }, []);

  const tGridProps = useMemo(() => {
    const type: TGridType = 'standalone';
    const sortDirection: SortDirection = 'desc';
    return {
      alertConsumers: OBSERVABILITY_ALERT_CONSUMERS,
      appId: observabilityFeatureId,
      casePermissions,
      type,
      columns,
      deletedEventIds: [],
      defaultCellActions: getDefaultCellActions({ enableFilterActions: false }),
      end: rangeTo,
      filters: [],
      indexNames: [indexName],
      itemsPerPage: 10,
      itemsPerPageOptions: [10, 25, 50],
      loadingText: i18n.translate('xpack.observability.alertsTable.loadingTextLabel', {
        defaultMessage: 'loading alerts',
      }),
      footerText: i18n.translate('xpack.observability.alertsTable.footerTextLabel', {
        defaultMessage: 'alerts',
      }),
      query: {
        query: `${ALERT_STATUS}: ${status}${kuery !== '' ? ` and ${kuery}` : ''}`,
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
      filterStatus: status as AlertStatus,
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
    indexName,
    kuery,
    leadingControlColumns,
    rangeFrom,
    rangeTo,
    setRefetch,
    status,
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
