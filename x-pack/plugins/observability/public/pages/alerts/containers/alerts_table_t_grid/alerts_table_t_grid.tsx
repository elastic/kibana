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

import {
  EuiButtonIcon,
  EuiDataGridColumn,
  EuiFlexGroup,
  EuiFlexItem,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiPopover,
  EuiToolTip,
} from '@elastic/eui';

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
import { CaseAttachments } from '@kbn/cases-plugin/public';
import { CommentType } from '@kbn/cases-plugin/common';
import { getAlertsPermissions } from '../../../../hooks/use_alert_permission';

import type { TopAlert } from '../alerts_page/alerts_page';

import { getRenderCellValue } from '../../components/render_cell_value';
import { observabilityAppId, observabilityFeatureId } from '../../../../../common';
import { useGetUserCasesPermissions } from '../../../../hooks/use_get_user_cases_permissions';
import { usePluginContext } from '../../../../hooks/use_plugin_context';
import { LazyAlertsFlyout } from '../../../..';
import { parseAlert } from '../../components/parse_alert';
import { translations, paths } from '../../../../config';
import { addDisplayNames } from './add_display_names';
import { ADD_TO_EXISTING_CASE, ADD_TO_NEW_CASE } from './translations';
import { ObservabilityAppServices } from '../../../../application/types';

const ALERT_TABLE_STATE_STORAGE_KEY = 'xpack.observability.alert.tableState';

interface AlertsTableTGridProps {
  indexNames: string[];
  rangeFrom: string;
  rangeTo: string;
  kuery?: string;
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

function ObservabilityActions({
  data,
  eventId,
  ecsData,
  setFlyoutAlert,
}: ObservabilityActionsProps) {
  const { observabilityRuleTypeRegistry } = usePluginContext();
  const dataFieldEs = data.reduce((acc, d) => ({ ...acc, [d.field]: d.value }), {});
  const [openActionsPopoverId, setActionsPopover] = useState(null);
  const { cases, http } = useKibana<ObservabilityAppServices>().services;

  const parseObservabilityAlert = useMemo(
    () => parseAlert(observabilityRuleTypeRegistry),
    [observabilityRuleTypeRegistry]
  );

  const alert = parseObservabilityAlert(dataFieldEs);

  const closeActionsPopover = useCallback(() => {
    setActionsPopover(null);
  }, []);

  const toggleActionsPopover = useCallback((id) => {
    setActionsPopover((current) => (current ? null : id));
  }, []);

  const casePermissions = useGetUserCasesPermissions();
  const ruleId = alert.fields['kibana.alert.rule.uuid'] ?? null;
  const linkToRule = ruleId ? http.basePath.prepend(paths.management.ruleDetails(ruleId)) : null;

  const caseAttachments: CaseAttachments = useMemo(() => {
    return ecsData?._id
      ? [
          {
            alertId: ecsData?._id ?? '',
            index: ecsData?._index ?? '',
            owner: observabilityFeatureId,
            type: CommentType.alert,
            rule: cases.helpers.getRuleIdFromEvent({ ecs: ecsData, data: data ?? [] }),
          },
        ]
      : [];
  }, [ecsData, cases.helpers, data]);

  const createCaseFlyout = cases.hooks.getUseCasesAddToNewCaseFlyout({
    attachments: caseAttachments,
  });

  const selectCaseModal = cases.hooks.getUseCasesAddToExistingCaseModal({
    attachments: caseAttachments,
  });

  const handleAddToNewCaseClick = useCallback(() => {
    createCaseFlyout.open();
    closeActionsPopover();
  }, [createCaseFlyout, closeActionsPopover]);

  const handleAddToExistingCaseClick = useCallback(() => {
    selectCaseModal.open();
    closeActionsPopover();
  }, [closeActionsPopover, selectCaseModal]);

  const actionsMenuItems = useMemo(() => {
    return [
      ...(casePermissions?.crud
        ? [
            <EuiContextMenuItem
              data-test-subj="add-to-existing-case-action"
              onClick={handleAddToExistingCaseClick}
              size="s"
            >
              {ADD_TO_EXISTING_CASE}
            </EuiContextMenuItem>,
            <EuiContextMenuItem
              data-test-subj="add-to-new-case-action"
              onClick={handleAddToNewCaseClick}
              size="s"
            >
              {ADD_TO_NEW_CASE}
            </EuiContextMenuItem>,
          ]
        : []),

      ...(!!linkToRule
        ? [
            <EuiContextMenuItem
              key="viewRuleDetails"
              data-test-subj="viewRuleDetails"
              href={linkToRule}
            >
              {translations.alertsTable.viewRuleDetailsButtonText}
            </EuiContextMenuItem>,
          ]
        : []),

      ...[
        <EuiContextMenuItem
          key="viewAlertDetails"
          data-test-subj="viewAlertDetails"
          onClick={() => setFlyoutAlert(alert)}
        >
          {translations.alertsTable.viewAlertDetailsButtonText}
        </EuiContextMenuItem>,
      ],
    ];
  }, [casePermissions?.crud, handleAddToExistingCaseClick, handleAddToNewCaseClick, linkToRule]);

  const actionsToolTip =
    actionsMenuItems.length <= 0
      ? translations.alertsTable.notEnoughPermissions
      : translations.alertsTable.moreActionsTextLabel;

  return (
    <>
      <EuiFlexGroup gutterSize="none" responsive={false}>
        <EuiFlexItem>
          <EuiToolTip content={translations.alertsTable.viewInAppTextLabel}>
            <EuiButtonIcon
              size="s"
              href={http.basePath.prepend(alert.link ?? '')}
              iconType="eye"
              color="text"
              aria-label={translations.alertsTable.viewInAppTextLabel}
            />
          </EuiToolTip>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiPopover
            button={
              <EuiToolTip content={actionsToolTip}>
                <EuiButtonIcon
                  display="empty"
                  size="s"
                  color="text"
                  iconType="boxesHorizontal"
                  aria-label={actionsToolTip}
                  onClick={() => toggleActionsPopover(eventId)}
                  data-test-subj="alertsTableRowActionMore"
                />
              </EuiToolTip>
            }
            isOpen={openActionsPopoverId === eventId}
            closePopover={closeActionsPopover}
            panelPaddingSize="none"
            anchorPosition="downLeft"
          >
            <EuiContextMenuPanel size="s" items={actionsMenuItems} />
          </EuiPopover>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
}
const FIELDS_WITHOUT_CELL_ACTIONS = [
  '@timestamp',
  'signal.rule.risk_score',
  'signal.reason',
  'kibana.alert.duration.us',
  'kibana.alert.reason',
];

export function AlertsTableTGrid(props: AlertsTableTGridProps) {
  const { indexNames, rangeFrom, rangeTo, kuery, setRefetch } = props;

  const {
    timelines,
    application: { capabilities },
  } = useKibana<ObservabilityAppServices>().services;

  const [flyoutAlert, setFlyoutAlert] = useState<TopAlert | undefined>(undefined);
  const [tGridState, setTGridState] = useState<Partial<TGridModel> | null>(
    JSON.parse(localStorage.getItem(ALERT_TABLE_STATE_STORAGE_KEY) ?? 'null')
  );

  const casePermissions = useGetUserCasesPermissions();

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
      const newState = JSON.stringify({
        ...tGridState,
        columns: tGridState.columns?.map((c) =>
          pick(c, ['columnHeaderType', 'displayAsText', 'id', 'initialWidth', 'linkField'])
        ),
      });
      if (newState !== localStorage.getItem(ALERT_TABLE_STATE_STORAGE_KEY)) {
        localStorage.setItem(ALERT_TABLE_STATE_STORAGE_KEY, newState);
      }
    }
  }, [tGridState]);

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
            <ObservabilityActions
              {...actionProps}
              setEventsDeleted={setEventsDeleted}
              setFlyoutAlert={setFlyoutAlert}
            />
          );
        },
      },
    ];
  }, [setEventsDeleted]);

  const onStateChange = useCallback(
    (state: TGridState) => {
      const pickedState = pick(state.timelineById['standalone-t-grid'], [
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

  const tGridProps = useMemo(() => {
    const type: TGridType = 'standalone';
    const sortDirection: SortDirection = 'desc';
    return {
      appId: observabilityAppId,
      casesOwner: observabilityFeatureId,
      casePermissions,
      type,
      columns: (tGridState?.columns ?? columns).map(addDisplayNames),
      deletedEventIds,
      disabledCellActions: FIELDS_WITHOUT_CELL_ACTIONS,
      end: rangeTo,
      filters: [],
      hasAlertsCrudPermissions,
      indexNames,
      itemsPerPageOptions: [10, 25, 50],
      loadingText: translations.alertsTable.loadingTextLabel,
      footerText: translations.alertsTable.footerTextLabel,
      onStateChange,
      query: {
        query: kuery ?? '',
        language: 'kuery',
      },
      renderCellValue: getRenderCellValue({ setFlyoutAlert }),
      rowRenderers: NO_ROW_RENDER,
      // TODO: implement Kibana data view runtime fields in observability
      runtimeMappings: {},
      start: rangeFrom,
      setRefetch,
      showCheckboxes: false,
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
    casePermissions,
    rangeTo,
    hasAlertsCrudPermissions,
    indexNames,
    kuery,
    rangeFrom,
    setRefetch,
    leadingControlColumns,
    deletedEventIds,
    onStateChange,
    tGridState,
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
