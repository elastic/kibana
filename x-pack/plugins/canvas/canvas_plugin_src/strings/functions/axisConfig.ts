/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { axisConfig } from '../../functions/common/axisConfig';
import { FunctionHelp } from '.';
import { FunctionFactory, Position } from '../../functions/types';

export const help: FunctionHelp<FunctionFactory<typeof axisConfig>> = {
  help: i18n.translate('xpack.canvas.functions.axisConfigHelpText', {
    defaultMessage: 'Configure axis of a visualization',
  }),
  args: {
    max: i18n.translate('xpack.canvas.functions.axisConfig.args.maxHelpText', {
      defaultMessage:
        'Maximum value displayed in the axis. Must be a number or a date in {ms} or {iso} string',
      values: {
        ms: 'ms',
        iso: 'ISO8601',
      },
    }),
    min: i18n.translate('xpack.canvas.functions.axisConfig.args.maxHelpText', {
      defaultMessage:
        'Minimum value displayed in the axis. Must be a number or a date in {ms} or {iso} string',
      values: {
        ms: 'ms',
        iso: 'ISO8601',
      },
    }),
    position: i18n.translate('xpack.canvas.functions.axisConfig.args.positionHelpText', {
      defaultMessage: 'Position of the axis labels - top, bottom, left, and right',
      values: {
        examples: Object.values(Position).join(', '),
      },
    }),
    show: i18n.translate('xpack.canvas.functions.axisConfig.args.showHelpText', {
      defaultMessage: 'Show the axis labels?',
    }),
    tickSize: i18n.translate('xpack.canvas.functions.axisConfig.args.tickSizeHelpText', {
      defaultMessage: 'Increment size between each tick. Use for number axes only',
    }),
  },
};
