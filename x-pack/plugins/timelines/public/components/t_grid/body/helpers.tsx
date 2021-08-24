/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERT_REASON,
  ALERT_RULE_CREATED_BY,
  ALERT_RULE_DESCRIPTION,
  ALERT_RULE_ENABLED,
  ALERT_RULE_FROM,
  ALERT_RULE_UUID,
  ALERT_RULE_INTERVAL,
  ALERT_RULE_NAME,
  ALERT_RULE_NOTE,
  ALERT_RULE_REFERENCES,
  ALERT_RULE_RISK_SCORE,
  ALERT_RULE_RULE_ID,
  ALERT_RULE_SEVERITY,
  ALERT_RULE_TAGS,
  ALERT_RULE_TO,
  ALERT_RULE_TYPE,
  ALERT_RULE_UPDATED_BY,
  ALERT_RULE_VERSION,
  ALERT_WORKFLOW_STATUS,
} from '@kbn/rule-data-utils';
import { isEmpty } from 'lodash/fp';
import { EuiDataGridCellValueElementProps } from '@elastic/eui';
import {
  ALERT_ANCESTORS_DEPTH,
  ALERT_ANCESTORS_ID,
  ALERT_ANCESTORS_INDEX,
  ALERT_ANCESTORS_RULE,
  ALERT_ANCESTORS_TYPE,
  ALERT_ORIGINAL_EVENT_ACTION,
  ALERT_ORIGINAL_EVENT_CATEGORY,
  ALERT_ORIGINAL_EVENT_CODE,
  ALERT_ORIGINAL_EVENT_CREATED,
  ALERT_ORIGINAL_EVENT_DATASET,
  ALERT_ORIGINAL_EVENT_DURATION,
  ALERT_ORIGINAL_EVENT_END,
  ALERT_ORIGINAL_EVENT_HASH,
  ALERT_ORIGINAL_EVENT_ID,
  ALERT_ORIGINAL_EVENT_KIND,
  ALERT_ORIGINAL_EVENT_MODULE,
  ALERT_ORIGINAL_EVENT_ORIGINAL,
  ALERT_ORIGINAL_EVENT_OUTCOME,
  ALERT_ORIGINAL_EVENT_PROVIDER,
  ALERT_ORIGINAL_EVENT_RISK_SCORE,
  ALERT_ORIGINAL_EVENT_RISK_SCORE_NORM,
  ALERT_ORIGINAL_EVENT_SEQUENCE,
  ALERT_ORIGINAL_EVENT_SEVERITY,
  ALERT_ORIGINAL_EVENT_START,
  ALERT_ORIGINAL_EVENT_TIMEZONE,
  ALERT_ORIGINAL_EVENT_TYPE,
  ALERT_ORIGINAL_TIME,
  ALERT_RULE_FALSE_POSITIVES,
  ALERT_RULE_FILTERS,
  ALERT_RULE_IMMUTABLE,
  ALERT_RULE_INDEX,
  ALERT_RULE_LANGUAGE,
  ALERT_RULE_MAX_SIGNALS,
  ALERT_RULE_QUERY,
  ALERT_RULE_SAVED_ID,
  ALERT_RULE_SIZE,
  ALERT_RULE_THREAT,
  ALERT_RULE_THREAT_TACTIC_ID,
  ALERT_RULE_THREAT_TACTIC_NAME,
  ALERT_RULE_THREAT_TACTIC_REFERENCE,
  ALERT_RULE_THREAT_TECHNIQUE_ID,
  ALERT_RULE_THREAT_TECHNIQUE_NAME,
  ALERT_RULE_THREAT_TECHNIQUE_REFERENCE,
  ALERT_RULE_TIMELINE_ID,
  ALERT_RULE_TIMELINE_TITLE,
} from '../../../../common/alerts';

import type { Ecs } from '../../../../common/ecs';
import type {
  BrowserField,
  TimelineItem,
  TimelineNonEcsData,
} from '../../../../common/search_strategy';
import type {
  ColumnHeaderOptions,
  SortColumnTimeline,
  SortDirection,
  TimelineEventsType,
} from '../../../../common/types/timeline';

import type { EuiTheme } from '../../../../../../../src/plugins/kibana_react/common';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const omitTypenameAndEmpty = (k: string, v: any): any | undefined =>
  k !== '__typename' && v != null ? v : undefined;

export const stringifyEvent = (ecs: Ecs): string => JSON.stringify(ecs, omitTypenameAndEmpty, 2);

/**
 * Creates mapping of eventID -> fieldData for given fieldsToKeep. Used to store additional field
 * data necessary for custom timeline actions in conjunction with selection state
 * @param timelineData
 * @param eventIds
 * @param fieldsToKeep
 */
export const getEventIdToDataMapping = (
  timelineData: TimelineItem[],
  eventIds: string[],
  fieldsToKeep: string[]
): Record<string, TimelineNonEcsData[]> =>
  timelineData.reduce((acc, v) => {
    const fvm = eventIds.includes(v._id)
      ? { [v._id]: v.data.filter((ti) => fieldsToKeep.includes(ti.field)) }
      : {};
    return {
      ...acc,
      ...fvm,
    };
  }, {});

export const isEventBuildingBlockType = (event: Ecs): boolean =>
  !isEmpty(event.kibana?.alert?.rule?.building_block_type);

export const isEvenEqlSequence = (event: Ecs): boolean => {
  if (!isEmpty(event.eql?.sequenceNumber)) {
    try {
      const sequenceNumber = (event.eql?.sequenceNumber ?? '').split('-')[0];
      return parseInt(sequenceNumber, 10) % 2 === 0;
    } catch {
      return false;
    }
  }
  return false;
};
/** Return eventType raw or kibana or eql */
export const getEventType = (event: Ecs): Omit<TimelineEventsType, 'all'> => {
  if (!isEmpty(event.kibana?.alert?.rule?.uuid)) {
    return 'kibana.alert';
  } else if (!isEmpty(event.eql?.parentId)) {
    return 'eql';
  }
  return 'raw';
};

/** Maps (Redux) `SortDirection` to the `direction` values used by `EuiDataGrid` */
export const mapSortDirectionToDirection = (sortDirection: SortDirection): 'asc' | 'desc' => {
  switch (sortDirection) {
    case 'asc': // fall through
    case 'desc':
      return sortDirection;
    default:
      return 'desc';
  }
};

/**
 * Maps `EuiDataGrid` columns to their Redux representation by combining the
 * `columns` with metadata from `columnHeaders`
 */
export const mapSortingColumns = ({
  columns,
  columnHeaders,
}: {
  columnHeaders: ColumnHeaderOptions[];
  columns: Array<{
    id: string;
    direction: 'asc' | 'desc';
  }>;
}): SortColumnTimeline[] =>
  columns.map(({ id, direction }) => ({
    columnId: id,
    columnType: columnHeaders.find((ch) => ch.id === id)?.type ?? 'text',
    sortDirection: direction,
  }));

export const allowSorting = ({
  browserField,
  fieldName,
}: {
  browserField: Partial<BrowserField> | undefined;
  fieldName: string;
}): boolean => {
  const isAggregatable = browserField?.aggregatable ?? false;

  const isAllowlistedNonBrowserField = ([
    ALERT_ANCESTORS_DEPTH,
    ALERT_ANCESTORS_ID,
    ALERT_ANCESTORS_INDEX,
    ALERT_ANCESTORS_RULE,
    ALERT_ANCESTORS_TYPE,
    ALERT_ORIGINAL_EVENT_ACTION,
    ALERT_ORIGINAL_EVENT_CATEGORY,
    ALERT_ORIGINAL_EVENT_CODE,
    ALERT_ORIGINAL_EVENT_CREATED,
    ALERT_ORIGINAL_EVENT_DATASET,
    ALERT_ORIGINAL_EVENT_DURATION,
    ALERT_ORIGINAL_EVENT_END,
    ALERT_ORIGINAL_EVENT_HASH,
    ALERT_ORIGINAL_EVENT_ID,
    ALERT_ORIGINAL_EVENT_KIND,
    ALERT_ORIGINAL_EVENT_MODULE,
    ALERT_ORIGINAL_EVENT_ORIGINAL,
    ALERT_ORIGINAL_EVENT_OUTCOME,
    ALERT_ORIGINAL_EVENT_PROVIDER,
    ALERT_ORIGINAL_EVENT_RISK_SCORE,
    ALERT_ORIGINAL_EVENT_RISK_SCORE_NORM,
    ALERT_ORIGINAL_EVENT_SEQUENCE,
    ALERT_ORIGINAL_EVENT_SEVERITY,
    ALERT_ORIGINAL_EVENT_START,
    ALERT_ORIGINAL_EVENT_TIMEZONE,
    ALERT_ORIGINAL_EVENT_TYPE,
    ALERT_ORIGINAL_TIME,
    ALERT_REASON,
    ALERT_RULE_CREATED_BY,
    ALERT_RULE_DESCRIPTION,
    ALERT_RULE_ENABLED,
    ALERT_RULE_FALSE_POSITIVES,
    ALERT_RULE_FILTERS,
    ALERT_RULE_FROM,
    ALERT_RULE_UUID,
    ALERT_RULE_IMMUTABLE,
    ALERT_RULE_INDEX,
    ALERT_RULE_INTERVAL,
    ALERT_RULE_LANGUAGE,
    ALERT_RULE_MAX_SIGNALS,
    ALERT_RULE_NAME,
    ALERT_RULE_NOTE,
    ALERT_RULE_QUERY,
    ALERT_RULE_REFERENCES,
    ALERT_RULE_RISK_SCORE,
    ALERT_RULE_RULE_ID,
    ALERT_RULE_SAVED_ID,
    ALERT_RULE_SEVERITY,
    ALERT_RULE_SIZE,
    ALERT_RULE_TAGS,
    ALERT_RULE_THREAT,
    ALERT_RULE_THREAT_TACTIC_ID,
    ALERT_RULE_THREAT_TACTIC_NAME,
    ALERT_RULE_THREAT_TACTIC_REFERENCE,
    ALERT_RULE_THREAT_TECHNIQUE_ID,
    ALERT_RULE_THREAT_TECHNIQUE_NAME,
    ALERT_RULE_THREAT_TECHNIQUE_REFERENCE,
    ALERT_RULE_TIMELINE_ID,
    ALERT_RULE_TIMELINE_TITLE,
    ALERT_RULE_TO,
    ALERT_RULE_TYPE,
    ALERT_RULE_UPDATED_BY,
    ALERT_RULE_VERSION,
    ALERT_WORKFLOW_STATUS,
  ] as string[]).includes(fieldName);

  return isAllowlistedNonBrowserField || isAggregatable;
};
export const addBuildingBlockStyle = (
  ecs: Ecs,
  theme: EuiTheme,
  setCellProps: EuiDataGridCellValueElementProps['setCellProps']
) => {
  if (isEventBuildingBlockType(ecs)) {
    setCellProps({
      style: {
        backgroundColor: `${theme.eui.euiColorHighlight}`,
      },
    });
  } else {
    // reset cell style
    setCellProps({
      style: {
        backgroundColor: 'inherit',
      },
    });
  }
};
