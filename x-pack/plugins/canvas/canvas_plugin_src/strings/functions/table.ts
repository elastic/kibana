/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { table } from '../../functions/common/table';
import { FunctionHelp } from '.';
import { FunctionFactory } from '../../functions/types';

export const help: FunctionHelp<FunctionFactory<typeof table>> = {
  help: i18n.translate('xpack.canvas.functions.tableHelpText', {
    defaultMessage: 'Configure a {datatable} element',
    values: {
      datatable: 'datatable',
    },
  }),
  args: {
    font: i18n.translate('xpack.canvas.functions.table.args.fontHelpText', {
      defaultMessage: 'Font style',
    }),
    paginate: i18n.translate('xpack.canvas.functions.table.args.paginateHelpText', {
      defaultMessage:
        'Show pagination controls. If set to false only the first page will be displayed',
    }),
    perPage: i18n.translate('xpack.canvas.functions.table.args.perPageHelpText', {
      defaultMessage:
        'Show this many rows per page. You probably want to raise this is disabling pagination',
    }),
    showHeader: i18n.translate('xpack.canvas.functions.table.args.showHeaderHelpText', {
      defaultMessage: 'Show or hide the header row with titles for each column',
    }),
  },
};
