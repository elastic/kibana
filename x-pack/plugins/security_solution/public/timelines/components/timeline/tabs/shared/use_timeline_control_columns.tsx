/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash/fp';
import React, { useMemo } from 'react';
import type { EuiDataGridControlColumn } from '@elastic/eui';
import type { SortColumnTable } from '@kbn/securitysolution-data-table';
import { useLicense } from '../../../../../common/hooks/use_license';
import { SourcererScopeName } from '../../../../../common/store/sourcerer/model';
import { useSourcererDataView } from '../../../../../common/containers/sourcerer';
import { useIsExperimentalFeatureEnabled } from '../../../../../common/hooks/use_experimental_features';
import { defaultHeaders } from '../../body/column_headers/default_headers';
import { getDefaultControlColumn } from '../../body/control_columns';
import type { UnifiedActionProps } from '../../unified_components/data_table/control_column_cell_render';
import { TimelineId, TimelineTabs } from '../../../../../../common/types/timeline';
import { HeaderActions } from '../../../../../common/components/header_actions/header_actions';
import { ControlColumnCellRender } from '../../unified_components/data_table/control_column_cell_render';
import { defaultUdtHeaders } from '../../unified_components/default_headers';
import type { ColumnHeaderOptions } from '../../../../../../common/types';

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

  const defaultColumns = useMemo(
    () => (unifiedComponentsInTimelineEnabled ? defaultUdtHeaders : defaultHeaders),
    [unifiedComponentsInTimelineEnabled]
  );

  const localColumns = useMemo(
    () => (isEmpty(columns) ? defaultColumns : columns),
    [columns, defaultColumns]
  );

  return useMemo(() => {
    if (unifiedComponentsInTimelineEnabled) {
      return getDefaultControlColumn(ACTION_BUTTON_COUNT).map((x) => ({
        ...x,
        headerCellRender: function HeaderCellRender(props: UnifiedActionProps) {
          return (
            <HeaderActions
              width={x.width}
              browserFields={browserFields}
              columnHeaders={localColumns}
              isEventViewer={false}
              isSelectAllChecked={false}
              onSelectAll={() => {}}
              showEventsSelect={false}
              showSelectAllCheckbox={false}
              sort={sort}
              tabType={TimelineTabs.pinned}
              fieldBrowserOptions={{}}
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
  }, [ACTION_BUTTON_COUNT, browserFields, localColumns, sort, unifiedComponentsInTimelineEnabled]);
};
