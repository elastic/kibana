/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExpressionFunctionDefinition } from '@kbn/expressions-plugin/common';
import { isValidUrl } from '@kbn/presentation-util-plugin/common/lib';
import { ContainerStyle, Overflow, BackgroundRepeat, BackgroundSize } from '../../../types';
import { getFunctionHelp, getFunctionErrors } from '../../../i18n';

interface Output extends ContainerStyle {
  type: 'containerStyle';
}

export function containerStyle(): ExpressionFunctionDefinition<
  'containerStyle',
  null,
  ContainerStyle,
  Output
> {
  const { help, args: argHelp } = getFunctionHelp().containerStyle;
  const errors = getFunctionErrors().containerStyle;

  return {
    name: 'containerStyle',
    aliases: [],
    type: 'containerStyle',
    inputTypes: ['null'],
    help,
    args: {
      backgroundColor: {
        types: ['string'],
        help: argHelp.backgroundColor,
      },
      backgroundImage: {
        types: ['string'],
        help: argHelp.backgroundImage,
      },
      backgroundRepeat: {
        types: ['string'],
        help: argHelp.backgroundRepeat,
        default: 'no-repeat',
        options: Object.values(BackgroundRepeat),
      },
      backgroundSize: {
        types: ['string'],
        help: argHelp.backgroundSize,
        default: 'contain',
        options: Object.values(BackgroundSize),
      },
      border: {
        types: ['string'],
        help: argHelp.border,
      },
      borderRadius: {
        types: ['string'],
        help: argHelp.borderRadius,
      },
      opacity: {
        types: ['number'],
        help: argHelp.opacity,
      },
      overflow: {
        types: ['string'],
        help: argHelp.overflow,
        options: Object.values(Overflow),
        default: 'hidden',
      },
      padding: {
        types: ['string'],
        help: argHelp.padding,
      },
    },
    fn: (input, args) => {
      const { backgroundImage, backgroundSize, backgroundRepeat, ...remainingArgs } = args;
      const style = {
        type: 'containerStyle',
        ...remainingArgs,
      } as Output;

      if (backgroundImage) {
        if (!isValidUrl(backgroundImage)) {
          throw errors.invalidBackgroundImage();
        }

        style.backgroundImage = `url(${backgroundImage})`;
        style.backgroundSize = backgroundSize;
        style.backgroundRepeat = backgroundRepeat;
      }

      // removes keys with undefined value
      return JSON.parse(JSON.stringify(style));
    },
  };
}
