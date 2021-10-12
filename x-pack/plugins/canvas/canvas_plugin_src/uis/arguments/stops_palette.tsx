/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { EuiButton, EuiColorStops, EuiFlexGroup, EuiFlexItem, EuiSelect } from '@elastic/eui';
import { DatatableColumn, ExpressionAstExpression } from 'src/plugins/expressions';
import { templateFromReactComponent } from '../../../public/lib/template_from_react_component';
import { ArgumentStrings } from '../../../i18n';
import { ColorStop } from '@elastic/eui/src/components/color_picker/color_stops';

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

const StopsPaletteArgInput: React.FC<StopPaletteArgInputProps> = ({
  argValue,
  typeInstance,
  onValueChange,
  argId,
}) => {
  const [value, setValue] = useState(argValue);
  const confirm = typeInstance?.options?.confirm;
  const [colorStops, setColorStops] = useState<ColorStop[]>([]);

  useEffect(() => {
    setValue(argValue);
  }, [argValue]);

  const onChange = useCallback(
    (ev) => {
      const onChangeFn = confirm ? setValue : onValueChange;
      const astObj: ExpressionAstExpression = {
        type: 'expression',
        chain: [
          {
            type: 'function',
            function: 'visdimension',
            arguments: {
              _: [ev.target.value],
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
        <EuiColorStops
          label="Single start"
          onChange={(e: ColorStop[] | []) => {
            console.log(e);
            if (e) setColorStops(e);
          }}
          colorStops={colorStops}
          stopType="fixed"
        />
      </EuiFlexItem>
      {confirm && (
        <EuiFlexItem grow={false}>
          <EuiButton size="s" onClick={() => onValueChange(value)}>
            {confirm}
          </EuiButton>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

export const stopsPalette = () => ({
  name: 'stops_palette',
  displayName: strings.getDisplayName(),
  help: strings.getHelp(),
  simpleTemplate: templateFromReactComponent(StopsPaletteArgInput),
});
