/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiSelect } from '@elastic/eui';
import { DatatableColumn, ExpressionAstExpression } from 'src/plugins/expressions';
import { templateFromReactComponent } from '../../../public/lib/template_from_react_component';
import { ArgumentStrings } from '../../../i18n';
import { ResolvedArgProps, ResolvedColumns } from '../../../public/expression_types/arg';

const { VisDimension: strings } = ArgumentStrings;

type VisDimensionArgInputProps = {
  onValueChange: (value: ExpressionAstExpression) => void;
  argValue: ExpressionAstExpression;
  typeInstance: {
    options?: {
      confirm?: string;
    };
  };
} & ResolvedArgProps<ResolvedColumns>;

const VisDimensionArgInput: React.FC<VisDimensionArgInputProps> = ({
  argValue,
  typeInstance,
  onValueChange,
  resolved: { columns },
}) => {
  const [value, setValue] = useState(argValue);
  const confirm = typeInstance?.options?.confirm;

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

  const options = [
    { value: '', text: strings.getDefaultOptionName(), disabled: true },
    ...columns.map((column: DatatableColumn) => ({ value: column.name, text: column.name })),
  ];

  const selectedValue = value.chain[0].arguments._?.[0];

  const column =
    columns
      .map((col: DatatableColumn) => col.name)
      .find((colName: string) => colName === selectedValue) || '';

  return (
    <EuiFlexGroup gutterSize="s" direction="column">
      <EuiFlexItem>
        <EuiSelect compressed options={options} value={column} onChange={onChange} />
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

export const visdimension = () => ({
  name: 'vis_dimension',
  displayName: strings.getDisplayName(),
  help: strings.getHelp(),
  simpleTemplate: templateFromReactComponent(VisDimensionArgInput),
});
