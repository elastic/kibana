/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { server } from '../../functions/server/server';
import { FunctionHelp } from '.';
import { FunctionFactory } from '../../functions/types';

export const help: FunctionHelp<FunctionFactory<typeof server>> = {
  help: i18n.translate('xpack.canvas.functions.serverHelpText', {
    defaultMessage: 'Force the interpreter to return to the server',
  }),
  args: {},
};
