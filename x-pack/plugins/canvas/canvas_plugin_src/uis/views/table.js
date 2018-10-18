/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const table = () => ({
  name: 'table',
  displayName: i18n.translate('xpack.canvas.uis.views.tableDisplayName', {
    defaultMessage: 'Table style',
  }),
  help: i18n.translate('xpack.canvas.uis.views.tableHelpText', {
    defaultMessage: 'Set styling for a Table element',
  }),
  modelArgs: [],
  args: [
    {
      name: 'font',
      argType: 'font',
    },
    {
      name: 'perPage',
      displayName: i18n.translate('xpack.canvas.uis.views.table.args.perPageDisplayName', {
        defaultMessage: 'Rows per page',
      }),
      help: i18n.translate('xpack.canvas.uis.views.table.args.perPageHelpText', {
        defaultMessage: 'Number of rows to display per table page',
      }),
      argType: 'select',
      default: 10,
      options: {
        choices: ['', 5, 10, 25, 50, 100].map(v => ({ name: String(v), value: v })),
      },
    },
    {
      name: 'paginate',
      displayName: i18n.translate('xpack.canvas.uis.views.table.args.paginateDisplayName', {
        defaultMessage: 'Pagination',
      }),
      help: i18n.translate('xpack.canvas.uis.views.table.args.paginateHelpText', {
        defaultMessage:
          'Show or hide pagination controls. If disabled only the first page will be shown',
      }),
      argType: 'toggle',
      default: true,
    },
    {
      name: 'showHeader',
      displayName: i18n.translate('xpack.canvas.uis.views.table.args.showHeaderDisplayName', {
        defaultMessage: 'Header',
      }),
      help: i18n.translate('xpack.canvas.uis.views.table.args.showHeaderHelpText', {
        defaultMessage: 'Show or hide the header row with titles for each column',
      }),
      argType: 'toggle',
      default: true,
    },
  ],
});
