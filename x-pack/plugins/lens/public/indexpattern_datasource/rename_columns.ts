/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { ExpressionFunctionDefinition, Datatable, DatatableColumn } from 'src/plugins/expressions';
import { IndexPatternColumn } from './operations';

interface RemapArgs {
  idMap: string;
}

export type OriginalColumn = { id: string } & IndexPatternColumn;

export const renameColumns: ExpressionFunctionDefinition<
  'lens_rename_columns',
  Datatable,
  RemapArgs,
  Datatable
> = {
  name: 'lens_rename_columns',
  type: 'datatable',
  help: i18n.translate('xpack.lens.functions.renameColumns.help', {
    defaultMessage: 'A helper to rename the columns of a datatable',
  }),
  args: {
    idMap: {
      types: ['string'],
      help: i18n.translate('xpack.lens.functions.renameColumns.idMap.help', {
        defaultMessage:
          'A JSON encoded object in which keys are the old column ids and values are the corresponding new ones. All other columns ids are kept.',
      }),
    },
  },
  inputTypes: ['datatable'],
  fn(data, { idMap: encodedIdMap }) {
    const idMap = JSON.parse(encodedIdMap) as Record<string, OriginalColumn>;

    return {
      type: 'datatable',
      rows: data.rows.map((row) => {
        const mappedRow: Record<string, unknown> = {};
        Object.entries(idMap).forEach(([fromId, toId]) => {
          mappedRow[toId.id] = row[fromId];
        });

        Object.entries(row).forEach(([id, value]) => {
          if (id in idMap) {
            mappedRow[idMap[id].id] = value;
          } else {
            mappedRow[id] = value;
          }
        });

        return mappedRow;
      }),
      columns: data.columns.map((column) => {
        const mappedItem = idMap[column.id];

        if (!mappedItem) {
          return column;
        }

        return {
          ...column,
          id: mappedItem.id,
          name: getColumnName(mappedItem, column),
        };
      }),
    };
  },
};

function getColumnName(originalColumn: OriginalColumn, newColumn: DatatableColumn) {
  if (originalColumn && originalColumn.operationType === 'date_histogram') {
    const fieldName = originalColumn.sourceField;

    // HACK: This is a hack, and introduces some fragility into
    // column naming. Eventually, this should be calculated and
    // built more systematically.
    return newColumn.name.replace(fieldName, originalColumn.label);
  }

  return originalColumn.label;
}
