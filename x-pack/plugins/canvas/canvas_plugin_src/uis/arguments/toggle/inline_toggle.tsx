/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSwitch } from '@elastic/eui';
import { ExpressionAstExpression } from '@kbn/expressions-plugin/common';
import { templateFromReactComponent } from '../../../../public/lib/template_from_react_component';
import { ArgumentStrings } from '../../../../i18n';

const { Toggle: strings } = ArgumentStrings;

interface Props {
  onValueChange: (value: boolean | string | ExpressionAstExpression) => void;
  argValue: boolean | string | ExpressionAstExpression;
  renderError: () => void;
  argId: string;
  typeInstance: {
    displayName: string;
    options?: {
      labelValue: string;
    };
  };
}

const InlineToggleArgInput: FC<Props> = ({
  onValueChange,
  argValue,
  argId,
  renderError,
  typeInstance,
}) => {
  const handleChange = () => onValueChange(!argValue);
  if (typeof argValue !== 'boolean') {
    renderError();
    return null;
  }
  return (
    <EuiFlexGroup gutterSize="none" direction="column">
      <EuiFlexItem>
        <EuiSwitch
          compressed
          id={argId}
          checked={argValue}
          onChange={handleChange}
          aria-label={typeInstance.displayName}
          label={typeInstance.options?.labelValue}
          showLabel
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const inlineToggle = () => ({
  name: 'inlineToggle',
  displayName: strings.getDisplayName(),
  help: strings.getHelp(),
  simpleTemplate: templateFromReactComponent(InlineToggleArgInput),
  default: false,
});
