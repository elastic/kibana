/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { table } from '../../../canvas_plugin_src/functions/common/table';
import { FunctionHelp } from '../function_help';
import { FunctionFactory } from '../../../types';
import { CSS, FONT_FAMILY, FONT_WEIGHT, BOOLEAN_FALSE } from '../../constants';

export const help: FunctionHelp<FunctionFactory<typeof table>> = {
  help: i18n.translate('xpack.canvas.functions.tableHelpText', {
    defaultMessage: 'Configures a table element.',
  }),
  args: {
    font: i18n.translate('xpack.canvas.functions.table.args.fontHelpText', {
      defaultMessage:
        'The {CSS} font properties for the contents of the table. For example, {FONT_FAMILY} or {FONT_WEIGHT}.',
      values: {
        CSS,
        FONT_FAMILY,
        FONT_WEIGHT,
      },
    }),
    paginate: i18n.translate('xpack.canvas.functions.table.args.paginateHelpText', {
      defaultMessage:
        'Show pagination controls? When {BOOLEAN_FALSE}, only the first page is displayed.',
      values: {
        BOOLEAN_FALSE,
      },
    }),
    perPage: i18n.translate('xpack.canvas.functions.table.args.perPageHelpText', {
      defaultMessage: 'The number of rows to display on each page.',
    }),
    showHeader: i18n.translate('xpack.canvas.functions.table.args.showHeaderHelpText', {
      defaultMessage: 'Show or hide the header row with titles for each column.',
    }),
  },
};
