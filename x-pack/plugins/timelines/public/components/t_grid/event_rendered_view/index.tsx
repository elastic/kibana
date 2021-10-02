/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  CriteriaWithPagination,
  EuiBasicTable,
  EuiBasicTableProps,
  EuiDataGridCellValueElementProps,
  EuiDataGridControlColumn,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ALERT_RULE_NAME } from '@kbn/rule-data-utils';
import { get } from 'lodash';
import moment from 'moment';
import React, { ComponentType, useCallback, useMemo } from 'react';
import styled from 'styled-components';

import { useUiSetting } from '../../../../../../../src/plugins/kibana_react/public';

import type { BrowserFields, RowRenderer, TimelineItem } from '../../../../common';
import { RuleName } from '../../rule_name';
import { isEventBuildingBlockType } from '../body/helpers';

const EventRenderedFlexItem = styled(EuiFlexItem)`
  div:first-child {
    padding-left: 0px;
    div {
      margin: 0px;
    }
  }
`;

const ActionsContainer = styled.div`
  display: flex;
  align-items: center;
  div div:first-child div.siemEventsTable__tdContent {
    margin-left: ${({ theme }) => theme.eui.paddingSizes.m};
  }
`;

// Fix typing issue with EuiBasicTable and styled
type BasicTableType = ComponentType<EuiBasicTableProps<TimelineItem>>;

const StyledEuiBasicTable = styled(EuiBasicTable as BasicTableType)`
  padding-top: ${({ theme }) => theme.eui.paddingSizes.m};
  .EventRenderedView__buildingBlock {
    background: ${({ theme }) => theme.eui.euiColorHighlight};
  }

  & > div:last-child {
    height: 72px;
  }
`;

export interface EventRenderedViewProps {
  alertToolbar: React.ReactNode;
  browserFields: BrowserFields;
  events: TimelineItem[];
  leadingControlColumns: EuiDataGridControlColumn[];
  onChangePage: (newActivePage: number) => void;
  onChangeItemsPerPage: (newItemsPerPage: number) => void;
  pageIndex: number;
  pageSize: number;
  pageSizeOptions: number[];
  rowRenderers: RowRenderer[];
  totalItemCount: number;
}
const PreferenceFormattedDateComponent = ({ value }: { value: Date }) => {
  const tz = useUiSetting<string>('dateFormat:tz');
  const dateFormat = useUiSetting<string>('dateFormat');
  const zone: string = moment.tz.zone(tz)?.name ?? moment.tz.guess();

  return <span data-test-subj="moment-date">{moment.tz(value, zone).format(dateFormat)}</span>;
};
export const PreferenceFormattedDate = React.memo(PreferenceFormattedDateComponent);

const EventRenderedViewComponent = ({
  alertToolbar,
  browserFields,
  events,
  leadingControlColumns,
  onChangePage,
  onChangeItemsPerPage,
  pageIndex,
  pageSize,
  pageSizeOptions,
  rowRenderers,
  totalItemCount,
}: EventRenderedViewProps) => {
  const ActionTitle = useMemo(
    () => (
      <EuiFlexGroup gutterSize="m">
        {leadingControlColumns.map((action) => {
          const ActionHeader = action.headerCellRender;
          return (
            <EuiFlexItem grow={false}>
              <ActionHeader />
            </EuiFlexItem>
          );
        })}
      </EuiFlexGroup>
    ),
    [leadingControlColumns]
  );

  const columns = useMemo(
    () => [
      {
        field: 'actions',
        name: ActionTitle,
        truncateText: false,
        hideForMobile: false,
        render: (name: unknown, item: unknown) => {
          const alertId = get(item, '_id');
          const rowIndex = events.findIndex((evt) => evt._id === alertId);
          return (
            <ActionsContainer>
              {leadingControlColumns.length > 0
                ? leadingControlColumns.map((action) => {
                    const getActions = action.rowCellRender as (
                      props: EuiDataGridCellValueElementProps
                    ) => React.ReactNode;
                    return getActions({
                      columnId: 'actions',
                      isDetails: false,
                      isExpandable: false,
                      isExpanded: false,
                      rowIndex,
                      setCellProps: () => null,
                    });
                  })
                : null}
            </ActionsContainer>
          );
        },
        width: '120px',
      },
      {
        field: 'ecs.timestamp',
        name: i18n.translate('xpack.timelines.alerts.EventRenderedView.timestamp.column', {
          defaultMessage: 'Timestamp',
        }),
        truncateText: false,
        hideForMobile: false,
        render: (name: unknown, item: TimelineItem) => {
          const timestamp = get(item, `ecs.timestamp`);
          return <PreferenceFormattedDate value={timestamp} />;
        },
      },
      {
        field: `ecs.${ALERT_RULE_NAME}`,
        name: i18n.translate('xpack.timelines.alerts.EventRenderedView.rule.column', {
          defaultMessage: 'Rule',
        }),
        truncateText: false,
        hideForMobile: false,
        render: (name: unknown, item: TimelineItem) => {
          const ruleName = get(item, `ecs.signal.rule.name`); /* `ecs.${ALERT_RULE_NAME}`*/
          const ruleId = get(item, `ecs.signal.rule.id`); /* `ecs.${ALERT_RULE_ID}`*/
          return <RuleName name={ruleName} id={ruleId} />;
        },
      },
      {
        field: 'eventSummary',
        name: i18n.translate('xpack.timelines.alerts.EventRenderedView.eventSummary.column', {
          defaultMessage: 'Event Summary',
        }),
        truncateText: false,
        hideForMobile: false,
        render: (name: unknown, item: TimelineItem) => {
          const ecsData = get(item, 'ecs');
          const reason = get(item, `ecs.signal.reason`); /* `ecs.${ALERT_REASON}`*/
          const rowRenderersValid = rowRenderers.filter((rowRenderer) =>
            rowRenderer.isInstance(ecsData)
          );
          return (
            <EuiFlexGroup gutterSize="none" direction="column">
              {reason && <EuiFlexItem>{reason}</EuiFlexItem>}
              {rowRenderersValid.length > 0 &&
                rowRenderersValid.map((rowRenderer) => (
                  <>
                    <EuiHorizontalRule size="half" margin="xs" />
                    <EventRenderedFlexItem>
                      {rowRenderer.renderRow({
                        browserFields,
                        data: ecsData,
                        isDraggable: false,
                        timelineId: 'NONE',
                      })}
                    </EventRenderedFlexItem>
                  </>
                ))}
            </EuiFlexGroup>
          );
        },
        width: '60%',
      },
    ],
    [ActionTitle, browserFields, events, leadingControlColumns, rowRenderers]
  );

  const handleTableChange = useCallback(
    (pageChange: CriteriaWithPagination<TimelineItem>) => {
      if (pageChange.page.index !== pageIndex) {
        onChangePage(pageChange.page.index);
      }
      if (pageChange.page.size !== pageSize) {
        onChangeItemsPerPage(pageChange.page.size);
      }
    },
    [onChangePage, pageIndex, pageSize, onChangeItemsPerPage]
  );

  const pagination = useMemo(
    () => ({
      pageIndex,
      pageSize,
      totalItemCount,
      pageSizeOptions,
      hidePerPageOptions: false,
    }),
    [pageIndex, pageSize, pageSizeOptions, totalItemCount]
  );

  return (
    <>
      {alertToolbar}
      <StyledEuiBasicTable
        compressed
        items={events}
        columns={columns}
        data-test-subj="event-rendered-view"
        pagination={pagination}
        onChange={handleTableChange}
        rowProps={({ ecs }: TimelineItem) =>
          isEventBuildingBlockType(ecs)
            ? {
                className: `EventRenderedView__buildingBlock`,
              }
            : {}
        }
      />
    </>
  );
};

export const EventRenderedView = React.memo(EventRenderedViewComponent);
