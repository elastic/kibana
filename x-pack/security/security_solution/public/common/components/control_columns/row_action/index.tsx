/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiDataGridCellValueElementProps } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { dataTableActions, TableId } from '@kbn/securitysolution-data-table';
import { useUiSetting$ } from '@kbn/kibana-react-plugin/public';
import { useKibana } from '../../../lib/kibana';
import { timelineActions } from '../../../../timelines/store';
import { ENABLE_EXPANDABLE_FLYOUT_SETTING } from '../../../../../common/constants';
import { DocumentDetailsRightPanelKey } from '../../../../flyout/document_details/right';
import type {
  SetEventsDeleted,
  SetEventsLoading,
  ControlColumnProps,
  ExpandedDetailType,
} from '../../../../../common/types';
import { getMappedNonEcsValue } from '../../../../timelines/components/timeline/body/data_driven_columns';
import type { TimelineItem, TimelineNonEcsData } from '../../../../../common/search_strategy';
import type { ColumnHeaderOptions, OnRowSelected } from '../../../../../common/types/timeline';
import { TimelineId } from '../../../../../common/types';
import { useIsExperimentalFeatureEnabled } from '../../../hooks/use_experimental_features';

type Props = EuiDataGridCellValueElementProps & {
  columnHeaders: ColumnHeaderOptions[];
  controlColumn: ControlColumnProps;
  data: TimelineItem;
  disabled: boolean;
  index: number;
  isEventViewer: boolean;
  loadingEventIds: Readonly<string[]>;
  onRowSelected: OnRowSelected;
  onRuleChange?: () => void;
  selectedEventIds: Readonly<Record<string, TimelineNonEcsData[]>>;
  showCheckboxes: boolean;
  tabType?: string;
  tableId: string;
  width: number;
  setEventsLoading: SetEventsLoading;
  setEventsDeleted: SetEventsDeleted;
  pageRowIndex: number;
  refetch?: () => void;
};

const RowActionComponent = ({
  columnHeaders,
  controlColumn,
  data,
  disabled,
  index,
  isEventViewer,
  loadingEventIds,
  onRowSelected,
  onRuleChange,
  pageRowIndex,
  rowIndex,
  selectedEventIds,
  showCheckboxes,
  tabType,
  tableId,
  setEventsLoading,
  setEventsDeleted,
  width,
  refetch,
}: Props) => {
  const { data: timelineNonEcsData, ecs: ecsData, _id: eventId, _index: indexName } = data ?? {};
  const { telemetry } = useKibana().services;
  const { openFlyout } = useExpandableFlyoutApi();

  const dispatch = useDispatch();
  const [isSecurityFlyoutEnabled] = useUiSetting$<boolean>(ENABLE_EXPANDABLE_FLYOUT_SETTING);
  const isExpandableFlyoutInCreateRuleEnabled = useIsExperimentalFeatureEnabled(
    'expandableFlyoutInCreateRuleEnabled'
  );

  const columnValues = useMemo(
    () =>
      timelineNonEcsData &&
      columnHeaders
        .map(
          (header) =>
            getMappedNonEcsValue({
              data: timelineNonEcsData,
              fieldName: header.id,
            }) ?? []
        )
        .join(' '),
    [columnHeaders, timelineNonEcsData]
  );

  let showExpandableFlyout: boolean;
  if (tableId === TableId.rulePreview) {
    showExpandableFlyout = isSecurityFlyoutEnabled && isExpandableFlyoutInCreateRuleEnabled;
  } else {
    showExpandableFlyout = isSecurityFlyoutEnabled;
  }

  const handleOnEventDetailPanelOpened = useCallback(() => {
    const updatedExpandedDetail: ExpandedDetailType = {
      panelView: 'eventDetail',
      params: {
        eventId: eventId ?? '',
        indexName: indexName ?? '',
      },
    };

    if (showExpandableFlyout) {
      openFlyout({
        right: {
          id: DocumentDetailsRightPanelKey,
          params: {
            id: eventId,
            indexName,
            scopeId: tableId,
          },
        },
      });
      telemetry.reportDetailsFlyoutOpened({
        tableId,
        panel: 'right',
      });
    }
    // TODO remove when https://github.com/elastic/security-team/issues/7462 is merged
    // support of old flyout in cases page
    else if (tableId === TableId.alertsOnCasePage) {
      dispatch(
        timelineActions.toggleDetailPanel({
          ...updatedExpandedDetail,
          id: TimelineId.casePage,
        })
      );
    }
    // TODO remove when https://github.com/elastic/security-team/issues/7462 is merged
    // support of old flyout
    else {
      dispatch(
        dataTableActions.toggleDetailPanel({
          ...updatedExpandedDetail,
          tabType,
          id: tableId,
        })
      );
    }
  }, [dispatch, eventId, indexName, openFlyout, tabType, tableId, showExpandableFlyout, telemetry]);

  const Action = controlColumn.rowCellRender;

  if (!timelineNonEcsData || !ecsData || !eventId) {
    return <span data-test-subj="noData" />;
  }

  return (
    <>
      {Action && (
        <Action
          ariaRowindex={pageRowIndex + 1}
          checked={Object.keys(selectedEventIds).includes(eventId)}
          columnId={controlColumn.id || ''}
          columnValues={columnValues || ''}
          data={timelineNonEcsData}
          data-test-subj="actions"
          disabled={disabled}
          ecsData={ecsData}
          eventId={eventId}
          index={index}
          isEventViewer={isEventViewer}
          loadingEventIds={loadingEventIds}
          onEventDetailsPanelOpened={handleOnEventDetailPanelOpened}
          onRowSelected={onRowSelected}
          onRuleChange={onRuleChange}
          rowIndex={rowIndex}
          showCheckboxes={showCheckboxes}
          tabType={tabType}
          timelineId={tableId}
          width={width}
          setEventsLoading={setEventsLoading}
          setEventsDeleted={setEventsDeleted}
          refetch={refetch}
        />
      )}
    </>
  );
};

export const RowAction = React.memo(RowActionComponent);
