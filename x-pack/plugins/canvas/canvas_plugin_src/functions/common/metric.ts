/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { openSans } from '../../../common/lib/fonts';
import { ContextFunction, Render, Style } from '../types';
import { getFunctionHelp } from '../../strings';

type Context = string | null;

interface Arguments {
  label: string;
  metricFont: Style;
  labelFont: Style;
}

export function metric(): ContextFunction<'metric', Context, Arguments, Render<Arguments>> {
  const { help, args: argHelp } = getFunctionHelp().metric;

  return {
    name: 'metric',
    aliases: [],
    type: 'render',
    help,
    context: {
      types: ['string', 'null'],
    },
    args: {
      label: {
        types: ['string'],
        aliases: ['_', 'text', 'description'],
        help: argHelp.label,
        default: '""',
      },
      metricFont: {
        types: ['style'],
        help: argHelp.metricFont,
        default: `{font size=48 family="${
          openSans.value
        }" color="#000000" align=center lHeight=48}`,
      },
      labelFont: {
        types: ['style'],
        help: argHelp.labelFont,
        default: `{font size=14 family="${openSans.value}" color="#000000" align=center}`,
      },
    },
    fn: (context, { label, metricFont, labelFont }) => {
      return {
        type: 'render',
        as: 'metric',
        value: {
          metric: context === null ? '?' : context,
          label,
          metricFont,
          labelFont,
        },
      };
    },
  };
}
