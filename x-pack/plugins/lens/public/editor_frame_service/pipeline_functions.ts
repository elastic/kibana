/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import DateMath from '@elastic/datemath';
import {
  ExpressionFunctionDefinition,
  KibanaDatatable,
  KibanaContext,
} from 'src/plugins/expressions/public';
import {
  TimeRangeOverride,
  JoinType,
  EditorFrameState,
  JoinState,
} from './editor_frame/state_management';
import { LensMultiTable } from '../types';
// import { i18n } from '@kbn/i18n';
// import { NodeDefinition, RenderNode } from '../types';

interface ShiftTime {
  type: TimeRangeOverride;
}

export const shiftTimeRange: ExpressionFunctionDefinition<
  'lens_shift_time',
  KibanaContext,
  ShiftTime,
  KibanaContext
> = {
  name: 'lens_shift_time',
  type: 'kibana_context',
  help: '',
  args: {
    type: {
      types: ['string'],
      help: '',
      required: true,
    },
  },
  inputTypes: ['kibana_context'],
  fn(input, { type }: ShiftTime) {
    if (type === 'default' || !input.timeRange) {
      return input;
    } else if (type === 'allBefore') {
      return { ...input, timeRange: { from: '2000-01-01', to: input.timeRange.to } };
    } else if (type === 'previous') {
      const from = DateMath.parse(input.timeRange.from)!;
      const to = DateMath.parse(input.timeRange.to, { roundUp: true })!;
      const duration = from?.diff(to);
      const newFrom = from?.subtract(duration).toString();
      return { ...input, timeRange: { from: newFrom, to: input.timeRange.from } };
    } else {
      return {
        ...input,
        timeRange: undefined,
      };
    }
  },
};

export const join: ExpressionFunctionDefinition<
  'lens_join',
  LensMultiTable,
  JoinState,
  KibanaDatatable
> = {
  name: 'lens_join',
  type: 'kibana_datatable',
  help: '',
  args: {
    joinType: {
      types: ['string'],
      help: '',
      required: true,
    },
    leftLayerId: {
      types: ['string'],
      help: '',
      required: true,
    },
    rightLayerId: {
      types: ['string'],
      help: '',
      required: true,
    },
    leftColumnId: {
      types: ['string'],
      help: '',
      required: true,
    },
    rightColumnId: {
      types: ['string'],
      help: '',
      required: true,
    },
  },
  inputTypes: ['lens_multitable'],
  fn(input, { joinType, leftLayerId, rightLayerId, leftColumnId, rightColumnId }: JoinArgs) {
    return joinTables(
      joinType,
      input.tables[leftLayerId],
      input.tables[rightLayerId],
      leftColumnId,
      rightColumnId
    );
  },
};

export function joinTables(
  joinType: JoinType,
  left: KibanaDatatable,
  right: KibanaDatatable,
  leftId?: string,
  rightId?: string
): KibanaDatatable {
  if (joinType === 'full') {
    return {
      type: 'kibana_datatable',
      columns: left.columns.concat(right.columns),
      rows: left.rows.concat(right.rows),
    };
  }

  if (!leftId) {
    leftId = left.columns[0].id;
  }
  if (!rightId) {
    rightId = right.columns[0].id;
  }

  if (joinType === 'left_outer') {
    return {
      type: 'kibana_datatable',
      columns: left.columns.concat(right.columns.filter((col) => col.id !== rightId)),
      rows: left.rows.map((row) => {
        const leftValue = row[leftId];
        const matchingRow = right.rows.find((row) => row[rightId] === leftValue);
        return {
          ...row,
          [leftId]: matchingRow[rightId],
        };
      }),
    };
  }
  if (joinType === 'right_outer') {
    return {
      type: 'kibana_datatable',
      columns: right.columns.concat(left.columns.filter((col) => col.id !== leftId)),
      rows: right.rows.map((row) => {
        const rightValue = row[rightId];
        const matchingRow = left.rows.find((row) => row[leftId] === rightValue);
        return {
          ...row,
          [rightId]: matchingRow[leftId],
        };
      }),
    };
  }

  if (joinType === 'inner') {
    return {
      type: 'kibana_datatable',
      columns: left.columns.concat(right.columns.filter((col) => col.id !== rightId)),
      rows: left.rows
        .map((row) => {
          const leftValue = row[leftId];
          const matchingRow = right.rows.find((row) => row[rightId] === leftValue);
          if (!matchingRow) {
            return false;
          }
          return {
            ...row,
            [leftId]: matchingRow[rightId],
          };
        })
        .filter((row) => !!row),
    };
  }
}
