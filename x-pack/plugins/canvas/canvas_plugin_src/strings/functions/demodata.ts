/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { demodata } from '../../functions/server/demodata';
import { FunctionHelp } from '.';
import { FunctionFactory } from '../../functions/types';

export const help: FunctionHelp<FunctionFactory<typeof demodata>> = {
  help: i18n.translate('xpack.canvas.functions.demodataHelpText', {
    defaultMessage:
      'A mock data set that includes project {ci} times with usernames, countries and run phases',
    values: {
      ci: 'CI',
    },
  }),
  args: {
    type: i18n.translate('xpack.canvas.functions.demodata.args.typeHelpText', {
      defaultMessage: 'The name of the demo data set to use',
    }),
  },
};
