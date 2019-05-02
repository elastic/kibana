/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { openSans } from '../../../common/lib/fonts';
import { ContextFunction, Render, Style } from '../types';

type Context = string | null;

interface Arguments {
  label: string;
  metricFont: Style;
  labelFont: Style;
}

export function metric(): ContextFunction<'metric', Context, Arguments, Render<Arguments>> {
  return {
    name: 'metric',
    aliases: [],
    type: 'render',
    help: 'A number with a label',
    context: {
      types: ['string', 'null'],
    },
    args: {
      label: {
        types: ['string'],
        aliases: ['_', 'text', 'description'],
        help: 'Text describing the metric',
        default: '""',
      },
      metricFont: {
        types: ['style'],
        help: 'Font settings for the metric. Technically you can stick other styles in here too!',
        default: `{font size=48 family="${
          openSans.value
        }" color="#000000" align=center lHeight=48}`,
      },
      labelFont: {
        types: ['style'],
        help: 'Font settings for the label. Technically you can stick other styles in here too!',
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
