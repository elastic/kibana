/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { ExpressionAstExpression } from 'src/plugins/expressions';
import { ColorStop } from '@elastic/eui/src/components/color_picker/color_stops';
import { templateFromReactComponent } from '../../../public/lib/template_from_react_component';
import { ArgumentStrings } from '../../../i18n';
import { PalettePicker } from '../../../public/components/palette_picker';

const { StopsPalette: strings } = ArgumentStrings;

interface StopPaletteArgInputProps {
  onValueChange: (value: ExpressionAstExpression) => void;
  argValue: ExpressionAstExpression;
  argId?: string;
  typeInstance: {
    options?: {
      confirm?: string;
    };
  };
}

const convertColorsToPaletteArgs = (colors: ColorStop[]) => {
  return colors.reduce<{ color: string[]; stop: number[] }>(
    (args, colorStop) => {
      args.color.push(colorStop.color);
      args.stop.push(colorStop.stop);
      return args;
    },
    { color: [], stop: [] }
  );
};

const convertPaletteArgColorAndStop = (argValue: ExpressionAstExpression): ColorStop[] => {
  const { color: colors = [], stop = [] } = argValue.chain[0]?.arguments ?? {};
  return (colors as string[]).map((color, index) => ({ color, stop: stop[index] as number }));
};

const StopsPaletteArgInput: React.FC<StopPaletteArgInputProps> = ({
  argValue,
  typeInstance,
  onValueChange,
  argId,
}) => {
  const [value, setValue] = useState(argValue);
  const confirm = typeInstance?.options?.confirm;
  const colorStopsFromArg = convertPaletteArgColorAndStop(value);
  const [colorStops, setColorStops] = useState<ColorStop[]>(colorStopsFromArg);

  useEffect(() => {
    setValue(argValue);
  }, [argValue]);

  const onChange = useCallback(
    (colorsWithStops) => {
      const onChangeFn = confirm ? setValue : onValueChange;
      const astObj: ExpressionAstExpression = {
        type: 'expression',
        chain: [
          {
            type: 'function',
            function: 'palette',
            arguments: {
              ...convertColorsToPaletteArgs(colorsWithStops),
            },
          },
        ],
      };

      onChangeFn(astObj);
    },
    [confirm, onValueChange]
  );

  return (
    <EuiFlexGroup gutterSize="s" direction="column">
      <EuiFlexItem>
        <PalettePicker id={argId} additionalPalettes={[]} clearable={false} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const stopsPalette = () => ({
  name: 'stops_palette',
  displayName: strings.getDisplayName(),
  help: strings.getHelp(),
  simpleTemplate: templateFromReactComponent(StopsPaletteArgInput),
});
