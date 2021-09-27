/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERT_REASON,
  ALERT_RULE_CONSUMER,
  ALERT_RULE_NAMESPACE,
  ALERT_RULE_PRODUCER,
  ALERT_RULE_RULE_ID,
  ALERT_WORKFLOW_STATUS,
} from '@kbn/rule-data-utils';
import {
  ALERT_ANCESTORS,
  ALERT_BUILDING_BLOCK_TYPE,
  ALERT_ORIGINAL_EVENT,
  ALERT_ORIGINAL_TIME,
} from '@kbn/securitysolution-rules';
import { isEmpty } from 'lodash/fp';

import { EuiDataGridCellValueElementProps } from '@elastic/eui';
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
  fieldsToKeep: string[],
  hasAlertsCrud: boolean,
  hasAlertsCrudPermissionsByRule?: ({
    ruleConsumer,
    ruleProducer,
  }: {
    ruleConsumer: string;
    ruleProducer?: string;
  }) => boolean
): Record<string, TimelineNonEcsData[]> =>
  timelineData.reduce((acc, v) => {
    // FUTURE DEVELOPER
    // We only have one featureId for security solution therefore we can just use hasAlertsCrud
    // but for o11y we can multiple featureIds so we need to check every consumer
    // of the alert to see if they have the permission to update the alert
    const ruleConsumers = v.data.find((d) => d.field === ALERT_RULE_CONSUMER)?.value ?? [];
    const ruleProducers = v.data.find((d) => d.field === ALERT_RULE_PRODUCER)?.value ?? [];
    const hasPermissions = hasAlertsCrudPermissionsByRule
      ? hasAlertsCrudPermissionsByRule({
          ruleConsumer: ruleConsumers.length > 0 ? ruleConsumers[0] : '',
          ruleProducer: ruleProducers.length > 0 ? ruleProducers[0] : undefined,
        })
      : hasAlertsCrud;

    const fvm =
      hasPermissions && eventIds.includes(v._id)
        ? { [v._id]: v.data.filter((ti) => fieldsToKeep.includes(ti.field)) }
        : {};
    return {
      ...acc,
      ...fvm,
    };
  }, {});

export const isEventBuildingBlockType = (event: Ecs): boolean =>
  !isEmpty(event[ALERT_BUILDING_BLOCK_TYPE]);

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
/** Return eventType raw or signal or eql */
export const getEventType = (event: Ecs): Omit<TimelineEventsType, 'all'> => {
  if (!isEmpty(event[ALERT_RULE_RULE_ID])) {
    return 'signal';
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

  const isAllowlistedNonBrowserField = [
    ALERT_ORIGINAL_TIME,
    ALERT_REASON,
    `${ALERT_ANCESTORS}.depth`,
    `${ALERT_ANCESTORS}.id`,
    `${ALERT_ANCESTORS}.rule`,
    `${ALERT_ANCESTORS}.type`,
    `${ALERT_ORIGINAL_EVENT}.action`,
    `${ALERT_ORIGINAL_EVENT}.category`,
    `${ALERT_ORIGINAL_EVENT}.code`,
    `${ALERT_ORIGINAL_EVENT}.created`,
    `${ALERT_ORIGINAL_EVENT}.dataset`,
    `${ALERT_ORIGINAL_EVENT}.duration`,
    `${ALERT_ORIGINAL_EVENT}.end`,
    `${ALERT_ORIGINAL_EVENT}.hash`,
    `${ALERT_ORIGINAL_EVENT}.id`,
    `${ALERT_ORIGINAL_EVENT}.kind`,
    `${ALERT_ORIGINAL_EVENT}.module`,
    `${ALERT_ORIGINAL_EVENT}.original`,
    `${ALERT_ORIGINAL_EVENT}.outcome`,
    `${ALERT_ORIGINAL_EVENT}.provider`,
    `${ALERT_ORIGINAL_EVENT}.risk_score`,
    `${ALERT_ORIGINAL_EVENT}.risk_score_norm`,
    `${ALERT_ORIGINAL_EVENT}.sequence`,
    `${ALERT_ORIGINAL_EVENT}.severity`,
    `${ALERT_ORIGINAL_EVENT}.start`,
    `${ALERT_ORIGINAL_EVENT}.timezone`,
    `${ALERT_ORIGINAL_EVENT}.type`,
    `${ALERT_RULE_NAMESPACE}.created_by`,
    `${ALERT_RULE_NAMESPACE}.description`,
    `${ALERT_RULE_NAMESPACE}.enabled`,
    `${ALERT_RULE_NAMESPACE}.false_positives`,
    `${ALERT_RULE_NAMESPACE}.filters`,
    `${ALERT_RULE_NAMESPACE}.from`,
    `${ALERT_RULE_NAMESPACE}.immutable`,
    `${ALERT_RULE_NAMESPACE}.index`,
    `${ALERT_RULE_NAMESPACE}.interval`,
    `${ALERT_RULE_NAMESPACE}.language`,
    `${ALERT_RULE_NAMESPACE}.max_signals`,
    `${ALERT_RULE_NAMESPACE}.name`,
    `${ALERT_RULE_NAMESPACE}.note`,
    `${ALERT_RULE_NAMESPACE}.output_index`,
    `${ALERT_RULE_NAMESPACE}.query`,
    `${ALERT_RULE_NAMESPACE}.references`,
    `${ALERT_RULE_NAMESPACE}.risk_score`,
    `${ALERT_RULE_NAMESPACE}.rule_id`,
    `${ALERT_RULE_NAMESPACE}.saved_id`,
    `${ALERT_RULE_NAMESPACE}.severity`,
    `${ALERT_RULE_NAMESPACE}.size`,
    `${ALERT_RULE_NAMESPACE}.tags`,
    `${ALERT_RULE_NAMESPACE}.threat`,
    `${ALERT_RULE_NAMESPACE}.threat.tactic.id`,
    `${ALERT_RULE_NAMESPACE}.threat.tactic.name`,
    `${ALERT_RULE_NAMESPACE}.threat.tactic.reference`,
    `${ALERT_RULE_NAMESPACE}.threat.technique.id`,
    `${ALERT_RULE_NAMESPACE}.threat.technique.name`,
    `${ALERT_RULE_NAMESPACE}.threat.technique.reference`,
    `${ALERT_RULE_NAMESPACE}.timeline_id`,
    `${ALERT_RULE_NAMESPACE}.timeline_title`,
    `${ALERT_RULE_NAMESPACE}.to`,
    `${ALERT_RULE_NAMESPACE}.type`,
    `${ALERT_RULE_NAMESPACE}.updated_by`,
    `${ALERT_RULE_NAMESPACE}.uuid`,
    `${ALERT_RULE_NAMESPACE}.version`,
    'signal.status',
    ALERT_WORKFLOW_STATUS,
  ].includes(fieldName);

  return isAllowlistedNonBrowserField || isAggregatable;
};
export const addBuildingBlockStyle = (
  ecs: Ecs,
  theme: EuiTheme,
  setCellProps: EuiDataGridCellValueElementProps['setCellProps'],
  defaultStyles?: React.CSSProperties
) => {
  const currentStyles = defaultStyles ?? {};
  if (isEventBuildingBlockType(ecs)) {
    setCellProps({
      style: {
        ...currentStyles,
        backgroundColor: `${theme.eui.euiColorHighlight}`,
      },
    });
  } else {
    // reset cell style
    setCellProps({
      style: {
        ...currentStyles,
        backgroundColor: 'inherit',
      },
    });
  }
};
