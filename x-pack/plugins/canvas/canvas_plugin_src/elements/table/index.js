/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import header from './header.png';

export const table = () => ({
  name: 'table',
  displayName: i18n.translate('xpack.canvas.elements.tableDisplayName', {
    defaultMessage: 'Data table',
  }),
  help: i18n.translate('xpack.canvas.elements.tableHelpText', {
    defaultMessage: 'A scrollable grid for displaying data in a tabular format',
  }),
  image: header,
  expression: `filters
| demodata
| table
| render`,
});
