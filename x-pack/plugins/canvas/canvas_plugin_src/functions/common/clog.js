/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const clog = () => ({
  name: 'clog',
  help: i18n.translate('xpack.canvas.functions.clogHelpText', {
    defaultMessage: 'Outputs the context to the console',
  }),
  fn: context => {
    console.log(context); //eslint-disable-line no-console
    return context;
  },
});
