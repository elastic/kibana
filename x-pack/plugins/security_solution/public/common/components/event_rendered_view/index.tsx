/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type {
  CriteriaWithPagination,
  EuiBasicTableProps,
  EuiDataGridCellValueElementProps,
  EuiDataGridControlColumn,
  Pagination,
} from '@elastic/eui';
import { EuiBasicTable, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ALERT_REASON, ALERT_RULE_NAME, ALERT_RULE_UUID } from '@kbn/rule-data-utils';
import { get } from 'lodash';
import moment from 'moment';
import type { ComponentType } from 'react';
import React, { useCallback, useMemo } from 'react';
import styled from 'styled-components';

import { useUiSetting } from '@kbn/kibana-react-plugin/public';

import type { Ecs } from '../../../../common/ecs';
import { APP_UI_ID } from '../../../../common/constants';
import type { TimelineItem } from '../../../../common/search_strategy';
import type { RowRenderer } from '../../../../common/types';
import { RuleName } from '../rule_name';
import { isEventBuildingBlockType } from './helpers';
import { UnitCount } from '../toolbar/unit';

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
    margin-left: ${({ theme }) => theme.eui.euiSizeM};
  }
`;

// Fix typing issue with EuiBasicTable and styled
type BasicTableType = ComponentType<EuiBasicTableProps<TimelineItem>>;

const StyledEuiBasicTable = styled(EuiBasicTable as BasicTableType)`
  padding-top: ${({ theme }) => theme.eui.euiSizeM};
  .EventRenderedView__buildingBlock {
    background: ${({ theme }) => theme.eui.euiColorHighlight};
  }

  & > div:last-child {
    height: 72px;
  }

  & tr:nth-child(even) {
    background-color: ${({ theme }) => theme.eui.euiColorLightestShade};
  }

  & tr:nth-child(odd) {
    background-color: ${({ theme }) => theme.eui.euiColorEmptyShade};
  }
`;

export interface EventRenderedViewProps {
  events: TimelineItem[];
  leadingControlColumns: EuiDataGridControlColumn[];
  onChangePage: (newActivePage: number) => void;
  onChangeItemsPerPage: (newItemsPerPage: number) => void;
  rowRenderers: RowRenderer[];
  scopeId: string;
  pagination: Pagination;
  unitCountText: string;
  additionalControls?: React.ReactNode;
  getRowRenderer?: ({
    data,
    rowRenderers,
  }: {
    data: Ecs;
    rowRenderers: RowRenderer[];
  }) => RowRenderer | null;
}

const PreferenceFormattedDateComponent = ({ value }: { value: Date }) => {
  const tz = useUiSetting<string>('dateFormat:tz');
  const dateFormat = useUiSetting<string>('dateFormat');
  const zone: string = moment.tz.zone(tz)?.name ?? moment.tz.guess();

  return <span data-test-subj="moment-date">{moment.tz(value, zone).format(dateFormat)}</span>;
};
export const PreferenceFormattedDate = React.memo(PreferenceFormattedDateComponent);

const EventRenderedViewComponent = ({
  additionalControls,
  events,
  getRowRenderer,
  leadingControlColumns,
  onChangePage,
  onChangeItemsPerPage,
  rowRenderers,
  scopeId,
  pagination,
  unitCountText,
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
        mobileOptions: { show: true },
        render: (name: unknown, item: unknown) => {
          const alertId = get(item, '_id');
          const rowIndex = events.findIndex((evt) => evt._id === alertId);
          return (
            <ActionsContainer>
              {leadingControlColumns.length > 0
                ? leadingControlColumns.map((action) => {
                    const getActions = action.rowCellRender as (
                      props: Omit<EuiDataGridCellValueElementProps, 'colIndex'>
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
        // TODO: derive this from ACTION_BUTTON_COUNT as other columns are done
        width: '184px',
      },
      {
        field: 'ecs.timestamp',
        name: i18n.translate('xpack.securitySolution.EventRenderedView.timestamp.column', {
          defaultMessage: 'Timestamp',
        }),
        truncateText: false,
        mobileOptions: { show: true },
        render: (name: unknown, item: TimelineItem) => {
          const timestamp = get(item, `ecs.timestamp`);
          return <PreferenceFormattedDate value={timestamp} />;
        },
      },
      {
        field: `ecs.${ALERT_RULE_NAME}`,
        name: i18n.translate('xpack.securitySolution.EventRenderedView.rule.column', {
          defaultMessage: 'Rule',
        }),
        truncateText: false,
        mobileOptions: { show: true },
        render: (name: unknown, item: TimelineItem) => {
          const ruleName = get(item, `ecs.signal.rule.name`) ?? get(item, `ecs.${ALERT_RULE_NAME}`);
          const ruleId = get(item, `ecs.signal.rule.id`) ?? get(item, `ecs.${ALERT_RULE_UUID}`);
          return <RuleName name={ruleName} id={ruleId} appId={APP_UI_ID} />;
        },
      },
      {
        field: 'eventSummary',
        name: i18n.translate('xpack.securitySolution.EventRenderedView.eventSummary.column', {
          defaultMessage: 'Event Summary',
        }),
        truncateText: false,
        mobileOptions: { show: true },
        render: (name: unknown, item: TimelineItem) => {
          const ecsData = get(item, 'ecs');
          const reason = get(item, `ecs.signal.reason`) ?? get(item, `ecs.${ALERT_REASON}`);
          const rowRenderer =
            getRowRenderer != null
              ? getRowRenderer({ data: ecsData, rowRenderers })
              : rowRenderers.find((x) => x.isInstance(ecsData)) ?? null;

          return (
            <EuiFlexGroup gutterSize="none" direction="column" className="eui-fullWidth">
              {rowRenderer != null ? (
                <EventRenderedFlexItem className="eui-xScroll">
                  <div className="eui-displayInlineBlock">
                    {rowRenderer.renderRow({
                      data: ecsData,
                      isDraggable: false,
                      scopeId,
                    })}
                  </div>
                </EventRenderedFlexItem>
              ) : (
                <>
                  {reason && <EuiFlexItem data-test-subj="plain-text-reason">{reason}</EuiFlexItem>}
                </>
              )}
            </EuiFlexGroup>
          );
        },
        width: '60%',
      },
    ],
    [ActionTitle, events, getRowRenderer, leadingControlColumns, rowRenderers, scopeId]
  );

  const handleTableChange = useCallback(
    (pageChange: CriteriaWithPagination<TimelineItem>) => {
      if (pageChange.page.index !== pagination.pageIndex) {
        onChangePage(pageChange.page.index);
      }
      if (pageChange.page.size !== pagination.pageSize) {
        onChangeItemsPerPage(pageChange.page.size);
      }
    },
    [pagination.pageIndex, pagination.pageSize, onChangePage, onChangeItemsPerPage]
  );

  const toolbar = useMemo(
    () => (
      <EuiFlexGroup gutterSize="m" alignItems="center">
        <EuiFlexItem grow={false}>
          <UnitCount data-test-subj="server-side-event-count">{unitCountText}</UnitCount>
        </EuiFlexItem>
        {additionalControls}
      </EuiFlexGroup>
    ),
    [additionalControls, unitCountText]
  );

  return (
    <>
      {toolbar}
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
