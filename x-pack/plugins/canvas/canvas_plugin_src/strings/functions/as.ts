/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { asFn } from '../../functions/common/as';
import { FunctionHelp } from '.';
import { FunctionFactory } from '../../functions/types';

export const help: FunctionHelp<FunctionFactory<typeof asFn>> = {
  help: i18n.translate('xpack.canvas.functions.asHelpText', {
    defaultMessage: 'One or more conditions to check',
  }),
  args: {
    name: i18n.translate('xpack.canvas.functions.as.args.nameHelpText', {
      defaultMessage: 'A name to give the column',
    }),
  },
};
