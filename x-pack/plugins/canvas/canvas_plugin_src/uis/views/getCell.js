/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const getCell = () => ({
  name: 'getCell',
  displayName: i18n.translate('xpack.canvas.uis.views.getCellDisplayName', {
    defaultMessage: 'Get cell',
  }),
  help: i18n.translate('xpack.canvas.uis.views.getCellHelpText', {
    defaultMessage: 'Grab the first row and first column',
  }),
  modelArgs: ['size'],
  requiresContext: true,
  args: [],
});
