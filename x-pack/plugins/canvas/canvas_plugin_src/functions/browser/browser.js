/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const browser = () => ({
  name: 'browser',
  help: i18n.translate('xpack.canvas.functions.browserHelpText', {
    defaultMessage: 'Force the interpreter to return to the browser',
  }),
  args: {},
  fn: context => context,
});
