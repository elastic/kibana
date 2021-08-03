/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { embeddable } from '../../../canvas_plugin_src/functions/external/embeddable';
import { FunctionHelp } from '../function_help';
import { FunctionFactory } from '../../../types';

export const help: FunctionHelp<FunctionFactory<typeof embeddable>> = {
  help: i18n.translate('xpack.canvas.functions.embeddableHelpText', {
    defaultMessage: `Returns an embeddable`,
  }),
  args: {
    id: i18n.translate('xpack.canvas.functions.embeddable.args.idHelpText', {
      defaultMessage: `The ID of the embeddable saved object`,
    }),
    type: i18n.translate('xpack.canvas.functions.embeddable.args.typeHelpText', {
      defaultMessage: `The embeddable type`,
    }),
    timerange: i18n.translate('xpack.canvas.functions.embeddable.args.timerangeHelpText', {
      defaultMessage: `The timerange of data that should be included`,
    }),
    title: i18n.translate('xpack.canvas.functions.embeddable.args.titleHelpText', {
      defaultMessage: `The title for the Lens visualization object`,
    }),
    hideTitle: i18n.translate('xpack.canvas.functions.embeddable.args.titleHelpText', {
      defaultMessage: `The title for the Lens visualization object`,
    }),
    palette: i18n.translate('xpack.canvas.functions.embeddable.args.paletteHelpText', {
      defaultMessage: `The palette used for the Lens visualization`,
    }),
  },
};
