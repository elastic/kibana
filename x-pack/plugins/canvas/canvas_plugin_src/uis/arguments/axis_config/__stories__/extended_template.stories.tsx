/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { action } from '@storybook/addon-actions';
import React from 'react';
import { ExpressionAstExpression } from '../../../../../types';

import { ExtendedTemplate } from '../extended_template';

const defaultExpression: ExpressionAstExpression = {
  type: 'expression',
  chain: [
    {
      type: 'function',
      function: 'axisConfig',
      arguments: {},
    },
  ],
};

const defaultValues = {
  argValue: defaultExpression,
};

class Interactive extends React.Component<{}, typeof defaultValues> {
  public state = defaultValues;

  _onValueChange: (argValue: ExpressionAstExpression) => void = (argValue) => {
    action('onValueChange')(argValue);
    this.setState({ argValue });
  };

  public render() {
    return (
      <ExtendedTemplate
        onValueChange={this._onValueChange}
        argValue={this.state.argValue}
        typeInstance={{ name: 'xaxis' }}
      />
    );
  }
}

export default {
  title: 'arguments/AxisConfig',

  decorators: [
    (story) => <div style={{ width: '323px', padding: '16px', background: '#fff' }}>{story()}</div>,
  ],
};

export const Extended = () => <Interactive />;

Extended.story = {
  name: 'extended',
};

export const ExtendedDisabled = () => (
  <ExtendedTemplate
    onValueChange={action('onValueChange')}
    argValue={false}
    typeInstance={{ name: 'yaxis' }}
  />
);

ExtendedDisabled.story = {
  name: 'extended disabled',
};

export const _Extended = () => (
  <ExtendedTemplate
    onValueChange={action('onValueChange')}
    argValue={defaultExpression}
    typeInstance={{ name: 'yaxis' }}
  />
);

_Extended.story = {
  name: 'extended',
};
