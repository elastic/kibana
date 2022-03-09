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
  !isEmpty(event.kibana?.alert?.building_block_type);

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
    'kibana.alert.ancestors.depth',
    'kibana.alert.ancestors.id',
    'kibana.alert.ancestors.rule',
    'kibana.alert.ancestors.type',
    'kibana.alert.original_event.action',
    'kibana.alert.original_event.category',
    'kibana.alert.original_event.code',
    'kibana.alert.original_event.created',
    'kibana.alert.original_event.dataset',
    'kibana.alert.original_event.duration',
    'kibana.alert.original_event.end',
    'kibana.alert.original_event.hash',
    'kibana.alert.original_event.id',
    'kibana.alert.original_event.kind',
    'kibana.alert.original_event.module',
    'kibana.alert.original_event.original',
    'kibana.alert.original_event.outcome',
    'kibana.alert.original_event.provider',
    'kibana.alert.original_event.risk_score',
    'kibana.alert.original_event.risk_score_norm',
    'kibana.alert.original_event.sequence',
    'kibana.alert.original_event.severity',
    'kibana.alert.original_event.start',
    'kibana.alert.original_event.timezone',
    'kibana.alert.original_event.type',
    'kibana.alert.original_time',
    'kibana.alert.reason',
    'kibana.alert.rule.created_by',
    'kibana.alert.rule.description',
    'kibana.alert.rule.enabled',
    'kibana.alert.rule.false_positives',
    'kibana.alert.rule.from',
    'kibana.alert.rule.uuid',
    'kibana.alert.rule.immutable',
    'kibana.alert.rule.interval',
    'kibana.alert.rule.max_signals',
    'kibana.alert.rule.name',
    'kibana.alert.rule.note',
    'kibana.alert.rule.references',
    'kibana.alert.risk_score',
    'kibana.alert.rule.rule_id',
    'kibana.alert.severity',
    'kibana.alert.rule.size',
    'kibana.alert.rule.tags',
    'kibana.alert.rule.threat',
    'kibana.alert.rule.threat.tactic.id',
    'kibana.alert.rule.threat.tactic.name',
    'kibana.alert.rule.threat.tactic.reference',
    'kibana.alert.rule.threat.technique.id',
    'kibana.alert.rule.threat.technique.name',
    'kibana.alert.rule.threat.technique.reference',
    'kibana.alert.rule.timeline_id',
    'kibana.alert.rule.timeline_title',
    'kibana.alert.rule.to',
    'kibana.alert.rule.type',
    'kibana.alert.rule.updated_by',
    'kibana.alert.rule.version',
    'kibana.alert.workflow_status',
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

/** Returns true when the specified column has cell actions */
export const hasCellActions = ({
  columnId,
  disabledCellActions,
}: {
  columnId: string;
  disabledCellActions: string[];
}) => !disabledCellActions.includes(columnId);
