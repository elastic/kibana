/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import moment from 'moment';
import type { DateRange } from '../../../../../../common/types';
import type { OperationDefinition } from '..';
import type { ReferenceBasedIndexPatternColumn, ValueFormatConfig } from '../column_types';
import { getColumnOrder } from '../../layer_helpers';

export interface ContextValues {
  dateRange?: DateRange;
  now?: Date;
}

export interface ConstantIndexPatternColumn extends ReferenceBasedIndexPatternColumn {
  operationType: 'constant';
  params?: {
    format?: ValueFormatConfig;
    value: 'interval' | 'now';
  };
}

export interface IntervalIndexPatternColumn extends ReferenceBasedIndexPatternColumn {
  operationType: 'interval';
}

export interface NowIndexPatternColumn extends ReferenceBasedIndexPatternColumn {
  operationType: 'now';
}

type ConstantsIndexPatternColumn = IntervalIndexPatternColumn | NowIndexPatternColumn;

function createContextValueBasedOperation<ColumnType extends ConstantsIndexPatternColumn>({
  label,
  type,
  getContextValue,
  description,
}: {
  label: string;
  type: ColumnType['operationType'];
  description: string;
  getContextValue: (context: ContextValues) => number;
}): OperationDefinition<ColumnType, 'managedReference'> {
  return {
    type,
    displayName: label,
    input: 'managedReference',
    selectionStyle: 'hidden',
    usedInMath: true,
    getDefaultLabel: () => label,
    isTransferable: () => true,
    getDisabledStatus() {
      return undefined;
    },
    getPossibleOperation() {
      return {
        dataType: 'number',
        isBucketed: false,
        scale: 'ratio',
      };
    },
    buildColumn: () => {
      return {
        label,
        dataType: 'number',
        operationType: type,
        isBucketed: false,
        scale: 'ratio',
        references: [],
      } as unknown as ColumnType;
    },
    toExpression: (layer, columnId, _, context = {}) => {
      const column = layer.columns[columnId] as ColumnType;
      return [
        {
          type: 'function',
          function: 'mathColumn',
          arguments: {
            id: [columnId],
            name: [column.label],
            expression: [String(getContextValue(context))],
          },
        },
      ];
    },
    createCopy(layers, source, target) {
      const currentColumn = layers[source.layerId].columns[
        source.columnId
      ] as IntervalIndexPatternColumn;
      const targetLayer = layers[target.layerId];
      const columns = {
        ...targetLayer.columns,
        [target.columnId]: { ...currentColumn },
      };
      return {
        ...layers,
        [target.layerId]: {
          ...targetLayer,
          columns,
          columnOrder: getColumnOrder({ ...targetLayer, columns }),
        },
      };
    },
    documentation: {
      section: 'constants',
      signature: '',
      description,
    },
  };
}

export const intervalOperation = createContextValueBasedOperation<IntervalIndexPatternColumn>({
  type: 'interval',
  label: 'Time range interval',
  description: i18n.translate('xpack.lens.indexPattern.interval.documentation.markdown', {
    defaultMessage: `
The current time range expressed in milliseconds (ms).
    `,
  }),
  getContextValue: ({ dateRange }) => {
    return dateRange ? moment(dateRange.toDate).diff(moment(dateRange.fromDate)) : 0;
  },
});

export const nowOperation = createContextValueBasedOperation<NowIndexPatternColumn>({
  type: 'now',
  label: 'Current now',
  description: i18n.translate('xpack.lens.indexPattern.now.documentation.markdown', {
    defaultMessage: `
  The current now moment used in Kibana expressed in milliseconds (ms).
      `,
  }),
  getContextValue: ({ now }) => {
    return now == null ? moment().valueOf() : +now;
  },
});

function findContextValue(column: ConstantIndexPatternColumn, context: ContextValues) {
  if (column.params?.value === 'interval') {
    return context.dateRange
      ? moment(context.dateRange.toDate).diff(moment(context.dateRange.fromDate))
      : 0;
  }
  if (column.params?.value === 'now') {
    return context.now == null ? moment().valueOf() : +context.now;
  }
}

export const constantsOperation: OperationDefinition<
  ConstantIndexPatternColumn,
  'managedReference'
> = {
  type: 'constant',
  displayName: 'Constants',
  input: 'managedReference',
  selectionStyle: 'hidden',
  usedInMath: true,
  operationParams: [{ name: 'value', type: 'string', required: true, defaultValue: 'interval' }],
  getDefaultLabel: () => 'Constants',
  isTransferable: () => true,
  getDisabledStatus() {
    return undefined;
  },
  getPossibleOperation() {
    return {
      dataType: 'number',
      isBucketed: false,
      scale: 'ratio',
    };
  },
  buildColumn: (_, columnParams) => {
    return {
      label: 'Constants',
      dataType: 'number',
      operationType: 'constant',
      isBucketed: false,
      scale: 'ratio',
      params: {
        value: columnParams?.value || 'interval',
      },
      references: [],
    };
  },
  toExpression: (layer, columnId, _, context = {}) => {
    const column = layer.columns[columnId] as ConstantIndexPatternColumn;
    return [
      {
        type: 'function',
        function: 'mathColumn',
        arguments: {
          id: [columnId],
          name: [column.label],
          expression: [String(findContextValue(column, context))],
        },
      },
    ];
  },
  createCopy(layers, source, target) {
    const currentColumn = layers[source.layerId].columns[
      source.columnId
    ] as IntervalIndexPatternColumn;
    const targetLayer = layers[target.layerId];
    const columns = {
      ...targetLayer.columns,
      [target.columnId]: { ...currentColumn },
    };
    return {
      ...layers,
      [target.layerId]: {
        ...targetLayer,
        columns,
        columnOrder: getColumnOrder({ ...targetLayer, columns }),
      },
    };
  },
  documentation: {
    section: 'constants',
    signature: i18n.translate('xpack.lens.indexPattern.constants.signature', {
      defaultMessage: '[value: "interval" | "now"]',
    }),
    description: i18n.translate('xpack.lens.indexPattern.constants.documentation.markdown', {
      defaultMessage: `
  The requested context token value returned as number. Date values (like \`"interval"\` or \`"now"\`) are expressed in milliseconds (ms).
      `,
    }),
  },
};
