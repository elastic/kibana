/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { embeddableFunctionFactory } from '../../../canvas_plugin_src/functions/external/embeddable';
import { FunctionHelp } from '../function_help';
import { FunctionFactory } from '../../../types';

export const help: FunctionHelp<FunctionFactory<ReturnType<typeof embeddableFunctionFactory>>> = {
  help: i18n.translate('xpack.canvas.functions.embeddableHelpText', {
    defaultMessage: `Returns an embeddable with the provided configuration`,
  }),
  args: {
    config: i18n.translate('xpack.canvas.functions.embeddable.args.idHelpText', {
      defaultMessage: `The base64 encoded embeddable input object`,
    }),
    type: i18n.translate('xpack.canvas.functions.embeddable.args.typeHelpText', {
      defaultMessage: `The embeddable type`,
    }),
  },
};
