/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { savedLens } from '../../../canvas_plugin_src/functions/external/saved_lens';
import { FunctionHelp } from '../function_help';
import { FunctionFactory } from '../../../types';

export const help: FunctionHelp<FunctionFactory<typeof savedLens>> = {
  help: i18n.translate('xpack.canvas.functions.savedLensHelpText', {
    defaultMessage: `Returns an embeddable for a saved Lens visualization object.`,
  }),
  args: {
    id: i18n.translate('xpack.canvas.functions.savedLens.args.idHelpText', {
      defaultMessage: `The ID of the saved Lens visualization object`,
    }),
    timerange: i18n.translate('xpack.canvas.functions.savedLens.args.timerangeHelpText', {
      defaultMessage: `The timerange of data that should be included`,
    }),
    title: i18n.translate('xpack.canvas.functions.savedLens.args.titleHelpText', {
      defaultMessage: `The title for the Lens visualization object`,
    }),
    palette: i18n.translate('xpack.canvas.functions.savedLens.args.paletteHelpText', {
      defaultMessage: `The palette used for the Lens visualization`,
    }),
  },
};
