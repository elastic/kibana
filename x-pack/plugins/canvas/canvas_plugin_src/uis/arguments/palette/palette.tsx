/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import PropTypes from 'prop-types';
import { ExpressionAstExpression } from 'src/plugins/expressions';
import { templateFromReactComponent } from '../../../../public/lib/template_from_react_component';
import { ArgumentStrings } from '../../../../i18n';
import { ColorPalette } from '../../../../common/lib';
import { astToPalette } from './utils';
import { ColorPaletteName, getPaletteType } from './palette_types';
import { CustomColorPalette } from '../../../../public/components/palette_picker';

const { Palette: strings, StopsPalette: stopsPaletteStrings } = ArgumentStrings;

interface Props {
  onValueChange: (value: ExpressionAstExpression) => void;
  argValue: ExpressionAstExpression;
  renderError: () => void;
  argId?: string;
  typeInstance: {
    options?: {
      type?: ColorPaletteName;
    };
  };
}

export const PaletteArgInput: FC<Props> = ({
  onValueChange,
  argId,
  argValue,
  renderError,
  typeInstance,
}) => {
  const handleChange = (palette: ColorPalette | CustomColorPalette): void => {
    let colorStopsPaletteConfig = {};
    if (palette.stops?.length) {
      colorStopsPaletteConfig = {
        stop: palette.stops,
        ...(palette.range ? { range: [palette.range] } : {}),
        ...(palette.continuity ? { continuity: [palette.continuity] } : {}),
      };
    }

    const astObj: ExpressionAstExpression = {
      type: 'expression',
      chain: [
        {
          type: 'function',
          function: 'palette',
          arguments: {
            _: palette.colors,
            gradient: [palette.gradient],
            ...colorStopsPaletteConfig,
          },
        },
      ],
    };

    onValueChange(astObj);
  };

  const palette = astToPalette(argValue, renderError);
  if (!palette) {
    renderError();
    return null;
  }

  const PalettePicker = getPaletteType(typeInstance.options?.type);
  return <PalettePicker id={argId} palette={palette} onChange={handleChange} />;
};

export const SimplePaletteArgInput: FC<Props> = (props) => {
  const { typeInstance } = props;
  const { type, ...restOptions } = typeInstance.options ?? {};
  return (
    <PaletteArgInput {...props} typeInstance={{ ...props.typeInstance, options: restOptions }} />
  );
};

export const StopsPaletteArgInput: FC<Props> = (props) => (
  <PaletteArgInput
    {...props}
    typeInstance={{
      ...props.typeInstance,
      options: { ...(props.typeInstance.options ?? {}), type: 'stops' },
    }}
  />
);

PaletteArgInput.propTypes = {
  argId: PropTypes.string,
  onValueChange: PropTypes.func.isRequired,
  argValue: PropTypes.any.isRequired,
  renderError: PropTypes.func,
};

const defaultPaletteOptions = {
  default:
    '{palette #882E72 #B178A6 #D6C1DE #1965B0 #5289C7 #7BAFDE #4EB265 #90C987 #CAE0AB #F7EE55 #F6C141 #F1932D #E8601C #DC050C}',
};

export const palette = () => ({
  name: 'palette',
  displayName: strings.getDisplayName(),
  help: strings.getHelp(),
  simpleTemplate: templateFromReactComponent(SimplePaletteArgInput),
  ...defaultPaletteOptions,
});

export const stopsPalette = () => ({
  name: 'stops_palette',
  help: stopsPaletteStrings.getHelp(),
  displayName: stopsPaletteStrings.getDisplayName(),
  template: templateFromReactComponent(StopsPaletteArgInput),
  ...defaultPaletteOptions,
});
