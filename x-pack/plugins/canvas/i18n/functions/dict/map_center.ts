/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { mapCenter } from '../../../canvas_plugin_src/functions/common/map_center';
import { FunctionHelp } from '../';
import { FunctionFactory } from '../../../types';

export const help: FunctionHelp<FunctionFactory<typeof mapCenter>> = {
  help: i18n.translate('xpack.canvas.functions.mapCenterHelpText', {
    defaultMessage: `Returns an object with the center coordinates and zoom level of the map`,
  }),
  args: {
    lat: i18n.translate('xpack.canvas.functions.mapCenter.args.latHelpText', {
      defaultMessage: `Latitude for the center of the map`,
    }),
    lon: i18n.translate('xpack.canvas.functions.savedMap.args.lonHelpText', {
      defaultMessage: `Longitude for the center of the map`,
    }),
    zoom: i18n.translate('xpack.canvas.functions.savedMap.args.zoomHelpText', {
      defaultMessage: `The zoom level of the map`,
    }),
  },
};
