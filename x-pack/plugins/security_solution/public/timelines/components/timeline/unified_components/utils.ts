/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiDataGridStyle } from '@elastic/eui';
import { flattenHit } from '@kbn/data-service';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import { GRID_STYLE } from '@kbn/unified-data-table/src/constants';
import type { TimelineItem } from '../../../../../common/search_strategy';
import { getEventTypeRowClassName } from './data_table/get_event_type_row_classname';

export type TimelineDataTableRecord = DataTableRecord & TimelineItem;

export interface TransformDataToUnfiedRowsBase<T> {
  events: DataTableRecord[] | TimelineItem[];
  dataView: DataView;
}

/**
 * @description - This and the `areTimelineRecords` function are TEMPORARY checks that should be made removed when
 * the Timeline 'data' and 'ecs' usage in the UI is replaced by the default DataTableRecord 'raw' and 'flattened' formats.
 * @param record - Either default timeline formatted data or unified data table formatted data
 * @returns whether or not the record is valid timeline formatted data
 */
export const isTimelineRecord = (record: TimelineItem | DataTableRecord): record is TimelineItem =>
  'ecs' in record && 'data' in record;

export const areTimelineRecords = (
  records: TimelineItem[] | DataTableRecord[]
): records is TimelineItem[] => records[0] && isTimelineRecord(records[0]);

export interface TransformDataToUnifiedRowsReturn {
  tableRows: TimelineDataTableRecord[] | DataTableRecord[];
  tableStylesOverride: EuiDataGridStyle;
}

export function transformDataToUnifiedRows<T>(
  args: TransformDataToUnfiedRowsBase<T>
): TransformDataToUnifiedRowsReturn {
  const { events = [], dataView } = args;

  if (!areTimelineRecords(events)) {
    return { tableRows: events, tableStylesOverride: GRID_STYLE };
  }

  const rowClasses: EuiDataGridStyle['rowClasses'] = {};
  const unifiedDataTableRows = events.map(({ _id, _index, ecs, data }, index) => {
    const _source = ecs as unknown as Record<string, unknown>;
    const hit = { _id, _index: String(_index), _source };

    /**
     * Side effect
     * We need to add a custom className for each row based on the event type. Rather than looping twice
     * we take advantage of this map to set the styles for each row
     */
    rowClasses[index] = getEventTypeRowClassName(ecs);
    /*
     * Ideally for unified data table we only need raw and flattened keys
     * but we use this transformed data within other parts of security solution
     * so we create a combined data format for timeline item and DataTableRecord
     *
     * */
    return {
      _id,
      id: _id,
      data,
      ecs,
      raw: hit,
      flattened: flattenHit(hit, dataView, {
        includeIgnoredValues: true,
      }),
    };
  });

  return { tableRows: unifiedDataTableRows, tableStylesOverride: { ...GRID_STYLE, rowClasses } };
}
