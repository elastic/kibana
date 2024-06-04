/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { EuiDataGridControlColumn } from '@elastic/eui';
import type { SortColumnTable } from '@kbn/securitysolution-data-table';
import { useLicense } from '../../../../../common/hooks/use_license';
import { SourcererScopeName } from '../../../../../sourcerer/store/model';
import { useSourcererDataView } from '../../../../../sourcerer/containers';
import { useIsExperimentalFeatureEnabled } from '../../../../../common/hooks/use_experimental_features';
import { getDefaultControlColumn } from '../../body/control_columns';
import type { UnifiedActionProps } from '../../unified_components/data_table/control_column_cell_render';
import { TimelineId, TimelineTabs } from '../../../../../../common/types/timeline';
import { HeaderActions } from '../../../../../common/components/header_actions/header_actions';
import { ControlColumnCellRender } from '../../unified_components/data_table/control_column_cell_render';
import type { ColumnHeaderOptions } from '../../../../../../common/types';
import { useTimelineColumns } from './use_timeline_columns';

const noSelectAll = ({ isSelected }: { isSelected: boolean }) => {};
export const useTimelineControlColumn = (
  columns: ColumnHeaderOptions[],
  sort: SortColumnTable[]
) => {
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
              tabType={TimelineTabs.pinned}
              {...props}
              timelineId={TimelineId.active}
            />
          );
        },
        rowCellRender: ControlColumnCellRender,
      })) as unknown as EuiDataGridControlColumn[];
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
  ]);
};
