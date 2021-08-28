/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import { toAbsoluteDates } from '../../../../../../src/plugins/data/common/search/aggs/utils/date_interval_utils/to_absolute_dates';
import type { ExpressionValueSearchContext } from '../../../../../../src/plugins/data/common/search/expressions/kibana_context_type';
import type { ExecutionContext } from '../../../../../../src/plugins/expressions/common/execution/types';
import type { ExpressionFunctionDefinition } from '../../../../../../src/plugins/expressions/common/expression_functions/types';
import type { Datatable } from '../../../../../../src/plugins/expressions/common/expression_types/specs/datatable';
import type { Adapters } from '../../../../../../src/plugins/inspector/common/adapters/types';
import type { LensMultiTable } from '../../types';

interface MergeTables {
  layerIds: string[];
  tables: Datatable[];
}

export const mergeTables: ExpressionFunctionDefinition<
  'lens_merge_tables',
  ExpressionValueSearchContext | null,
  MergeTables,
  LensMultiTable,
  ExecutionContext<Adapters, ExpressionValueSearchContext>
> = {
  name: 'lens_merge_tables',
  type: 'lens_multitable',
  help: i18n.translate('xpack.lens.functions.mergeTables.help', {
    defaultMessage:
      'A helper to merge any number of kibana tables into a single table and expose it via inspector adapter',
  }),
  args: {
    layerIds: {
      types: ['string'],
      help: '',
      multi: true,
    },
    tables: {
      types: ['datatable'],
      help: '',
      multi: true,
    },
  },
  inputTypes: ['kibana_context', 'null'],
  fn(input, { layerIds, tables }, context) {
    const resultTables: Record<string, Datatable> = {};
    tables.forEach((table, index) => {
      resultTables[layerIds[index]] = table;
      // adapter is always defined at that point because we make sure by the beginning of the function
      if (context?.inspectorAdapters?.tables) {
        context.inspectorAdapters.tables.allowCsvExport = true;
        context.inspectorAdapters.tables.logDatatable(layerIds[index], table);
      }
    });
    return {
      type: 'lens_multitable',
      tables: resultTables,
      dateRange: getDateRange(input),
    };
  },
};

function getDateRange(value?: ExpressionValueSearchContext | null) {
  if (!value || !value.timeRange) {
    return;
  }

  const dateRange = toAbsoluteDates(value.timeRange);

  if (!dateRange) {
    return;
  }

  return {
    fromDate: dateRange.from,
    toDate: dateRange.to,
  };
}
