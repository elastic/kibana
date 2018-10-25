/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { get } from 'lodash';
import { openSans } from '../../../common/lib/fonts';

const shapes = [
  'gauge',
  'horizontalBar',
  'horizontalPill',
  'semicircle',
  'unicorn',
  'verticalBar',
  'verticalPill',
  'wheel',
];

export const progress = () => ({
  name: 'progress',
  aliases: [],
  type: 'render',
  help: i18n.translate('xpack.canvas.functions.progressHelpText', {
    defaultMessage: 'Configure a progress element',
  }),
  context: {
    types: ['number'],
  },
  args: {
    shape: {
      type: ['string'],
      alias: ['_'],
      help: i18n.translate('xpack.canvas.functions.progress.args.shapeHelpText', {
        defaultMessage: 'Select {shapeNames}',
        values: {
          shapeNames: Object.keys(shapes)
            .map((key, i, src) => {
              return i === src.length - 1
                ? i18n.translate('xpack.canvas.functions.progress.args.shape.orText', {
                    defaultMessage: 'or {shapeName}',
                    values: { shapeName: shapes[key].name },
                  })
                : shapes[key].name;
            })
            .join(', '),
        },
      }),
      options: shapes,
      default: 'gauge',
    },
    max: {
      type: ['number'],
      help: i18n.translate('xpack.canvas.functions.progress.args.maxHelpText', {
        defaultMessage: 'Maximum value of the progress element',
      }),
      default: 1,
    },
    valueColor: {
      type: ['string'],
      help: i18n.translate('xpack.canvas.functions.progress.args.valueColorHelpText', {
        defaultMessage: 'Color of the progress bar',
      }),
      default: `#1785b0`,
    },
    barColor: {
      type: ['string'],
      help: i18n.translate('xpack.canvas.functions.progress.args.barColorHelpText', {
        defaultMessage: 'Color of the background bar',
      }),
      default: `#f0f0f0`,
    },
    valueWeight: {
      type: ['number'],
      help: i18n.translate('xpack.canvas.functions.progress.args.valueWeightHelpText', {
        defaultMessage: 'Thickness of the progress bar',
      }),
      default: 20,
    },
    barWeight: {
      type: ['number'],
      help: i18n.translate('xpack.canvas.functions.progress.args.barWeightHelpText', {
        defaultMessage: 'Thickness of the background bar',
      }),
      default: 20,
    },
    label: {
      type: ['boolean', 'string'],
      help: i18n.translate('xpack.canvas.functions.progress.args.labelHelpText', {
        defaultMessage:
          'Set true/false to show/hide label or provide a string to display as the label',
      }),
      default: true,
    },
    font: {
      types: ['style'],
      help: i18n.translate('xpack.canvas.functions.progress.args.fontHelpText', {
        defaultMessage:
          'Font settings for the label. Technically you can stick other styles in here too!',
      }),
      default: `{font size=24 family="${openSans.value}" color="#000000" align=center}`,
    },
  },
  fn: (value, args) => {
    if (args.max <= 0) {
      throw new Error(
        i18n.translate('xpack.canvas.functions.progress.maxValueLessOrEqualZeroMessageError', {
          defaultMessage: "'{maxArgument}' must be greater than 0",
          values: {
            maxArgument: 'max',
          },
        })
      );
    }
    if (value > args.max || value < 0) {
      throw new Error(
        i18n.translate(
          'xpack.canvas.functions.progress.contextIsNotBetweenZeroAndMaxValueMessageError',
          {
            defaultMessage: 'Context must be between 0 and {max}',
            values: { max: args.max },
          }
        )
      );
    }

    let label = '';
    if (args.label) label = typeof args.label === 'string' ? args.label : `${value}`;

    let font = {};

    if (get(args, 'font.spec')) {
      font = { ...args.font };
      font.spec.fill = args.font.spec.color; // SVG <text> uses fill for font color
    }

    return {
      type: 'render',
      as: 'progress',
      value: {
        value,
        ...args,
        label,
        font,
      },
    };
  },
});
