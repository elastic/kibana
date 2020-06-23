/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { savedLens } from '../../../canvas_plugin_src/functions/common/saved_lens';
import { FunctionHelp } from '../function_help';
import { FunctionFactory } from '../../../types';

export const help: FunctionHelp<FunctionFactory<typeof savedLens>> = {
  help: i18n.translate('xpack.canvas.functions.savedLensHelpText', {
    defaultMessage: `Returns an embeddable for a saved lens object`,
  }),
  args: {
    id: i18n.translate('xpack.canvas.functions.savedLens.args.idHelpText', {
      defaultMessage: `The ID of the Saved Lens Object`,
    }),
    timerange: i18n.translate('xpack.canvas.functions.savedLens.args.timerangeHelpText', {
      defaultMessage: `The timerange of data that should be included`,
    }),
    title: i18n.translate('xpack.canvas.functions.savedLens.args.titleHelpText', {
      defaultMessage: `The title for the lens emebeddable`,
    }),
  },
};
