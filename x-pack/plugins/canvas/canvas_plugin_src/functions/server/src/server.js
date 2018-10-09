/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const server = () => ({
  name: 'server',
  help: i18n.translate('xpack.canvas.functions.severHelpText', {
    defaultMessage: 'Force the interpreter to return to the server',
  }),
  args: {},
  fn: context => context,
});
