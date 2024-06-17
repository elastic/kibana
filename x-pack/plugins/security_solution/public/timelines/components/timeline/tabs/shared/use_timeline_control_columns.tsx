/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { EuiDataGridCellValueElementProps } from '@elastic/eui';
import type { SortColumnTable } from '@kbn/securitysolution-data-table';
import { useLicense } from '../../../../../common/hooks/use_license';
import { SourcererScopeName } from '../../../../../sourcerer/store/model';
import { useSourcererDataView } from '../../../../../sourcerer/containers';
import { useIsExperimentalFeatureEnabled } from '../../../../../common/hooks/use_experimental_features';
import { getDefaultControlColumn } from '../../body/control_columns';
import type { UnifiedActionProps } from '../../unified_components/data_table/control_column_cell_render';
import type { TimelineTabs } from '../../../../../../common/types/timeline';
import { HeaderActions } from '../../../../../common/components/header_actions/header_actions';
import { ControlColumnCellRender } from '../../unified_components/data_table/control_column_cell_render';
import type { ColumnHeaderOptions } from '../../../../../../common/types';
import { useTimelineColumns } from './use_timeline_columns';
import type { TimelineDataGridCellContext } from '../../types';

interface UseTimelineControlColumnArgs {
  columns: ColumnHeaderOptions[];
  sort: SortColumnTable[];
  timelineId: string;
  activeTab: TimelineTabs;
  refetch: () => void;
}

const EMPTY_STRING_ARRAY: string[] = [];

const noOp = () => {};
const noSelectAll = ({ isSelected }: { isSelected: boolean }) => {};
export const useTimelineControlColumn = ({
  columns,
  sort,
  timelineId,
  activeTab,
  refetch,
}: UseTimelineControlColumnArgs) => {
  const { browserFields } = useSourcererDataView(SourcererScopeName.timeline);

  const unifiedComponentsInTimelineEnabled = useIsExperimentalFeatureEnabled(
    'unifiedComponentsInTimelineEnabled'
  );

  const isEnterprisePlus = useLicense().isEnterprise();
  const ACTION_BUTTON_COUNT = isEnterprisePlus ? 6 : 5;
  const { localColumns } = useTimelineColumns(columns);

  // We need one less when the unified components are enabled because the document expand is provided by the unified data table
  const UNIFIED_COMPONENTS_ACTION_BUTTON_COUNT = ACTION_BUTTON_COUNT - 1;

  return useMemo(() => {
    if (unifiedComponentsInTimelineEnabled) {
      return getDefaultControlColumn(UNIFIED_COMPONENTS_ACTION_BUTTON_COUNT).map((x) => ({
        ...x,
        headerCellRender: function HeaderCellRender(props: UnifiedActionProps) {
          return (
            <HeaderActions
              width={x.width}
              browserFields={browserFields}
              columnHeaders={localColumns}
              isEventViewer={false}
              isSelectAllChecked={false}
              onSelectAll={noSelectAll}
              showEventsSelect={false}
              showSelectAllCheckbox={false}
              showFullScreenToggle={false}
              sort={sort}
              tabType={activeTab}
              {...props}
              timelineId={timelineId}
            />
          );
        },
        rowCellRender: (props: EuiDataGridCellValueElementProps & TimelineDataGridCellContext) => {
          return (
            <ControlColumnCellRender
              {...props}
              timelineId={timelineId}
              ariaRowindex={props.rowIndex}
              checked={false}
              columnValues=""
              data={props.events[props.rowIndex].data}
              ecsData={props.events[props.rowIndex].ecs}
              loadingEventIds={EMPTY_STRING_ARRAY}
              eventId={props.events[props.rowIndex]?._id}
              index={props.rowIndex}
              onEventDetailsPanelOpened={noOp}
              onRowSelected={noOp}
              refetch={refetch}
              showCheckboxes={false}
              setEventsLoading={noOp}
              setEventsDeleted={noOp}
            />
          );
        },
      }));
    } else {
      return getDefaultControlColumn(ACTION_BUTTON_COUNT).map((x) => ({
        ...x,
        headerCellRender: HeaderActions,
      })) as unknown as ColumnHeaderOptions[];
    }
  }, [
    ACTION_BUTTON_COUNT,
    UNIFIED_COMPONENTS_ACTION_BUTTON_COUNT,
    browserFields,
    localColumns,
    sort,
    unifiedComponentsInTimelineEnabled,
    timelineId,
    activeTab,
    refetch,
  ]);
};
