/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_RULE_CONSUMER, ALERT_RULE_PRODUCER } from '@kbn/rule-data-utils';
import { isEmpty } from 'lodash/fp';

import type { EuiDataGridCellValueElementProps } from '@elastic/eui';
import type { EuiTheme } from '@kbn/kibana-react-plugin/common';
import type { Ecs } from '../../../../common/ecs';
import type { TimelineItem, TimelineNonEcsData } from '../../../../common/search_strategy';
import type { ColumnHeaderOptions, SortDirection } from '../../../../common/types/timeline';
import type { SortColumnTable } from './types';

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
}): SortColumnTable[] =>
  columns.map(({ id, direction }) => {
    const columnHeader = columnHeaders.find((ch) => ch.id === id);
    const columnType = columnHeader?.type ?? '';
    const esTypes = columnHeader?.esTypes ?? [];

    return {
      columnId: id,
      columnType,
      esTypes,
      sortDirection: direction,
    };
  });

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
