/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import PropTypes from 'prop-types';
import { get } from 'lodash';
import { getType } from '@kbn/interpreter/common';
import { ExpressionAstFunction, ExpressionAstExpression } from 'src/plugins/expressions';
import { PalettePicker } from '../../../public/components/palette_picker';
import { templateFromReactComponent } from '../../../public/lib/template_from_react_component';
import { ArgumentStrings } from '../../../i18n';
import { identifyPalette, ColorPalette } from '../../../common/lib';

const { Palette: strings } = ArgumentStrings;

interface Props {
  onValueChange: (value: ExpressionAstExpression) => void;
  argValue: ExpressionAstExpression;
  renderError: () => void;
  argId?: string;
}

export const PaletteArgInput: FC<Props> = ({ onValueChange, argId, argValue, renderError }) => {
  // TODO: This is weird, its basically a reimplementation of what the interpretter would return.
  // Probably a better way todo this, and maybe a better way to handle template type objects in general?
  const astToPalette = ({ chain }: { chain: ExpressionAstFunction[] }): ColorPalette | null => {
    if (chain.length !== 1 || chain[0].function !== 'palette') {
      renderError();
      return null;
    }

    try {
      const colors = chain[0].arguments._.map((astObj) => {
        if (getType(astObj) !== 'string') {
          renderError();
        }
        return astObj;
      }) as string[];

      const gradient = get(chain[0].arguments.gradient, '[0]') as boolean;
      const palette = identifyPalette({ colors, gradient });

      if (palette) {
        return palette;
      }

      return ({
        id: 'custom',
        label: strings.getCustomPaletteLabel(),
        colors,
        gradient,
      } as any) as ColorPalette;
    } catch (e) {
      renderError();
    }
    return null;
  };

  const handleChange = (palette: ColorPalette): void => {
    const astObj: ExpressionAstExpression = {
      type: 'expression',
      chain: [
        {
          type: 'function',
          function: 'palette',
          arguments: {
            _: palette.colors,
            gradient: [palette.gradient],
          },
        },
      ],
    };

    onValueChange(astObj);
  };

  const palette = astToPalette(argValue);

  if (!palette) {
    renderError();
    return null;
  }

  return <PalettePicker id={argId} palette={palette} onChange={handleChange} />;
};

PaletteArgInput.propTypes = {
  argId: PropTypes.string,
  onValueChange: PropTypes.func.isRequired,
  argValue: PropTypes.any.isRequired,
  renderError: PropTypes.func,
};

export const palette = () => ({
  name: 'palette',
  displayName: strings.getDisplayName(),
  help: strings.getHelp(),
  default:
    '{palette #882E72 #B178A6 #D6C1DE #1965B0 #5289C7 #7BAFDE #4EB265 #90C987 #CAE0AB #F7EE55 #F6C141 #F1932D #E8601C #DC050C}',
  simpleTemplate: templateFromReactComponent(PaletteArgInput),
});
