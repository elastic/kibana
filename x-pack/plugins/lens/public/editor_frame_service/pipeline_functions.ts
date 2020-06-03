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
  Datatable,
} from 'src/plugins/expressions/public';
import {
  TimeRangeOverride,
  JoinType,
  EditorFrameState,
  JoinState,
} from './editor_frame/state_management';
import { LensMultiTable } from '../types';

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
  LensMultiTable
> = {
  name: 'lens_join',
  type: 'lens_multitable',
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
    },
    rightColumnId: {
      types: ['string'],
      help: '',
    },
  },
  inputTypes: ['lens_multitable'],
  fn(input, { joinType, leftLayerId, rightLayerId, leftColumnId, rightColumnId }: JoinState) {
    const newTable = joinTables(
      joinType,
      input.tables[leftLayerId],
      input.tables[rightLayerId],
      leftColumnId,
      rightColumnId
    );

    return {
      type: 'lens_multitable',
      tables: {
        [leftLayerId]: newTable,
      },
    };
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

  if (joinType === 'cross') {
    const rightValue = right.rows[0][rightId];
    return {
      type: 'kibana_datatable',
      columns: left.columns.concat(right.columns.filter((col) => col.id === rightId)),
      rows: left.rows.map((row) => {
        return {
          ...row,
          [rightId]: rightValue,
        };
      }),
    };
  }
}

interface MathArgs {
  layerId: string;
  operation: 'add' | 'subtract' | 'divide' | 'multiply';
  left: string;
  right: string;
}

export const math: ExpressionFunctionDefinition<
  'lens_multi_math',
  LensMultiTable,
  MathArgs,
  LensMultiTable
> = {
  name: 'lens_multi_math',
  type: 'lens_multitable',
  help: '',
  args: {
    layerId: {
      types: ['string'],
      help: '',
      required: true,
    },
    operation: {
      types: ['string'],
      help: '',
      required: true,
    },
    left: {
      types: ['string'],
      help: '',
      required: true,
    },
    right: {
      types: ['string'],
      help: '',
      required: true,
    },
  },
  inputTypes: ['lens_multitable'],
  fn(input, { layerId, operation, left, right }: MathArgs) {
    const doMath = (l, r) => {
      if (operation === 'add') {
        return l + r;
      } else if (operation === 'subtract') {
        return l - r;
      } else if (operation === 'divide') {
        return l / r;
      } else if (operation === 'multiply') {
        return l * r;
      }
    };
    return {
      type: 'lens_multitable',
      tables: {
        ...input.tables,
        [layerId]: {
          ...input.tables[layerId],
          columns: [
            ...input.tables[layerId].columns,
            {
              id: 'math',
            },
          ],
          rows: input.tables[layerId].rows.map((row) => ({
            ...row,
            math: doMath(row[left], row[right]),
          })),
        },
      },
    };
  },
};

interface MapColumnArgs {
  layerId: string;
  inputMapping: string;
  outputId: string;
  expression: (datatable: Datatable) => Promise<boolean | number | string | null>;
}

export const mapColumn: ExpressionFunctionDefinition<
  'lens_multi_map',
  LensMultiTable,
  MapColumnArgs,
  LensMultiTable
> = {
  name: 'lens_multi_map',
  type: 'lens_multitable',
  help: '',
  args: {
    layerId: {
      types: ['string'],
      help: '',
      required: true,
    },
    inputMapping: {
      types: ['string'],
      help: '',
      required: true,
    },
    outputId: {
      types: ['string'],
      help: '',
      required: true,
    },
    expression: {
      types: ['boolean', 'number', 'string', 'null'],
      resolve: false,
      help: '',
      required: true,
    },
  },
  inputTypes: ['lens_multitable'],
  async fn(input, args) {
    const expression = args.expression || (() => Promise.resolve(null));

    const table = input.tables[args.layerId];
    const inputMapping = JSON.parse(args.inputMapping);

    const mappedRows = table.rows.map((row) => {
      const output: Record<string, unknown> = {};
      Object.entries(inputMapping).forEach(([o, i]) => {
        output[o] = row[i];
      });
      return output;
    });

    const columns = Object.keys(inputMapping).map((id) => ({ name: id, type: 'number' }));

    const rowPromises = mappedRows.map((row, i) => {
      return expression({
        type: 'datatable',
        columns,
        rows: [row],
      }).then((val) => ({
        ...table.rows[i],
        [args.outputId]: val,
      }));
    });

    const result = await Promise.all(rowPromises).then((rows) => {
      return {
        ...input,
        tables: {
          [args.layerId]: {
            type: 'kibana_datatable',
            columns: table.columns.concat({ id: args.outputId, name: args.outputId }),
            rows,
          } as KibanaDatatable,
        },
      };
    });
    return result;
  },
};
