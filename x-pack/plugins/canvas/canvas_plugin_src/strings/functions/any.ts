/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { any } from '../../functions/common/any';
import { FunctionHelp } from '.';
import { FunctionFactory } from '../../functions/types';

export const help: FunctionHelp<FunctionFactory<typeof any>> = {
  help: i18n.translate('xpack.canvas.functions.anyHelpText', {
    defaultMessage: 'Return true if any of the conditions are true',
  }),
  args: {
    condition: i18n.translate('xpack.canvas.functions.any.args.conditionHelpText', {
      defaultMessage: 'One or more conditions to check',
    }),
  },
};
