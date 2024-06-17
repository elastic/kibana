/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { flattenHit } from '@kbn/data-service';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import type { TimelineItem } from '../../../../../common/search_strategy';

interface TransformTimelineItemToUnifiedRows {
  events: TimelineItem[];
  dataView: DataView;
}

export function transformTimelineItemToUnifiedRows(
  args: TransformTimelineItemToUnifiedRows
): Array<DataTableRecord & TimelineItem> {
  const { events, dataView } = args;
  const unifiedDataTableRows = events.map(({ _id, _index, ecs, data }) => {
    const _source = ecs as unknown as Record<string, unknown>;
    const hit = { _id, _index: String(_index), _source };
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
      get flattened() {
        return flattenHit(hit, dataView, {
          includeIgnoredValues: true,
        });
      },
    };
  });

  return unifiedDataTableRows;
}

export const UNIFIED_TIMELINE_CONFIG = {
  IS_CUSTOM_TIMELINE_DATA_GRID_ROW_LAZY_LOADING_ENABLED: false,
  DEFAULT_TIMELINE_ROW_HEIGHT: 32,
  DEFAULT_TIMELINE_ROW_HEIGHT_WITH_EVENT_DETAIL_ROW: 48,
  DEFAULT_PRELOADED_ROWS: 10,
};
