/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_RULE_CONSUMER, ALERT_RULE_PRODUCER } from '@kbn/rule-data-utils';
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
  !isEmpty(event.signal?.rule?.building_block_type);

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
  if (!isEmpty(event.signal?.rule?.id)) {
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
    'signal.ancestors.depth',
    'signal.ancestors.id',
    'signal.ancestors.rule',
    'signal.ancestors.type',
    'signal.original_event.action',
    'signal.original_event.category',
    'signal.original_event.code',
    'signal.original_event.created',
    'signal.original_event.dataset',
    'signal.original_event.duration',
    'signal.original_event.end',
    'signal.original_event.hash',
    'signal.original_event.id',
    'signal.original_event.kind',
    'signal.original_event.module',
    'signal.original_event.original',
    'signal.original_event.outcome',
    'signal.original_event.provider',
    'signal.original_event.risk_score',
    'signal.original_event.risk_score_norm',
    'signal.original_event.sequence',
    'signal.original_event.severity',
    'signal.original_event.start',
    'signal.original_event.timezone',
    'signal.original_event.type',
    'signal.original_time',
    'signal.parent.depth',
    'signal.parent.id',
    'signal.parent.index',
    'signal.parent.rule',
    'signal.parent.type',
    'signal.reason',
    'signal.rule.created_by',
    'signal.rule.description',
    'signal.rule.enabled',
    'signal.rule.false_positives',
    'signal.rule.filters',
    'signal.rule.from',
    'signal.rule.id',
    'signal.rule.immutable',
    'signal.rule.index',
    'signal.rule.interval',
    'signal.rule.language',
    'signal.rule.max_signals',
    'signal.rule.name',
    'signal.rule.note',
    'signal.rule.output_index',
    'signal.rule.query',
    'signal.rule.references',
    'signal.rule.risk_score',
    'signal.rule.rule_id',
    'signal.rule.saved_id',
    'signal.rule.severity',
    'signal.rule.size',
    'signal.rule.tags',
    'signal.rule.threat',
    'signal.rule.threat.tactic.id',
    'signal.rule.threat.tactic.name',
    'signal.rule.threat.tactic.reference',
    'signal.rule.threat.technique.id',
    'signal.rule.threat.technique.name',
    'signal.rule.threat.technique.reference',
    'signal.rule.timeline_id',
    'signal.rule.timeline_title',
    'signal.rule.to',
    'signal.rule.type',
    'signal.rule.updated_by',
    'signal.rule.version',
    'signal.status',
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
