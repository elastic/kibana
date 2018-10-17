/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const table = () => ({
  name: 'table',
  aliases: [],
  type: 'render',
  help: i18n.translate('xpack.canvas.functions.tableHelpText', {
    defaultMessage: 'Configure a Data Table element',
  }),
  context: {
    types: ['datatable'],
  },
  args: {
    font: {
      types: ['style'],
      default: '{font}',
      help: i18n.translate('xpack.canvas.functions.table.argsFontHelpText', {
        defaultMessage: 'Font style',
      }),
    },
    paginate: {
      types: ['boolean'],
      default: true,
      help: i18n.translate('xpack.canvas.functions.table.argsPaginateHelpText', {
        defaultMessage:
          'Show pagination controls. If set to false only the first page will be displayed',
      }),
    },
    perPage: {
      types: ['number'],
      default: 10,
      help: i18n.translate('xpack.canvas.functions.table.argsPerPageHelpText', {
        defaultMessage:
          'Show this many rows per page. You probably want to raise this is disabling pagination',
      }),
    },
    showHeader: {
      types: ['boolean'],
      default: true,
      help: i18n.translate('xpack.canvas.functions.table.argsShowHeaderHelpText', {
        defaultMessage: 'Show or hide the header row with titles for each column',
      }),
    },
  },
  fn: (context, args) => {
    const { font, paginate, perPage, showHeader } = args;

    return {
      type: 'render',
      as: 'table',
      value: {
        datatable: context,
        font,
        paginate,
        perPage,
        showHeader,
      },
    };
  },
});
