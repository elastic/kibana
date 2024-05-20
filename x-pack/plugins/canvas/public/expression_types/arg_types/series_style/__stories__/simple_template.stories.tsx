/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { action } from '@storybook/addon-actions';
import { storiesOf } from '@storybook/react';
import React from 'react';
// @ts-expect-error untyped local
import { getDefaultWorkpad } from '../../../../state/defaults';

import { SimpleTemplate } from '../simple_template';
import { ExpressionAstExpression } from '../../../../../types';

const defaultExpression: ExpressionAstExpression = {
  type: 'expression',
  chain: [
    {
      type: 'function',
      function: 'seriesStyle',
      arguments: {},
    },
  ],
};

const defaultValues = {
  argValue: defaultExpression,
};

class Interactive extends React.Component<{}, { argValue: ExpressionAstExpression }> {
  public state = defaultValues;

  public render() {
    return (
      <SimpleTemplate
        resolved={{ labels: [] }}
        argValue={this.state.argValue}
        onValueChange={(argValue) => {
          action('onValueChange')(argValue);
          this.setState({ argValue });
        }}
        workpad={getDefaultWorkpad()}
        typeInstance={{
          name: 'defaultStyle',
        }}
      />
    );
  }
}

storiesOf('arguments/SeriesStyle', module)
  .addDecorator((story) => (
    <div style={{ width: '323px', padding: '16px', background: '#fff' }}>{story()}</div>
  ))
  .add('simple', () => <Interactive />);

storiesOf('arguments/SeriesStyle/components', module)
  .addDecorator((story) => (
    <div style={{ width: '323px', padding: '16px', background: '#fff' }}>{story()}</div>
  ))
  .add('simple: no labels', () => (
    <SimpleTemplate
      argValue={defaultExpression}
      onValueChange={action('onValueChange')}
      workpad={getDefaultWorkpad()}
      resolved={{ labels: [] }}
      typeInstance={{
        name: 'defaultStyle',
      }}
    />
  ))
  .add('simple: defaults', () => (
    <SimpleTemplate
      argValue={defaultExpression}
      resolved={{ labels: ['label1', 'label2'] }}
      onValueChange={action('onValueChange')}
      workpad={getDefaultWorkpad()}
      typeInstance={{
        name: 'defaultStyle',
      }}
    />
  ))
  .add('simple: no series', () => (
    <SimpleTemplate
      argValue={defaultExpression}
      resolved={{ labels: [] }}
      onValueChange={action('onValueChange')}
      workpad={getDefaultWorkpad()}
      typeInstance={{
        name: 'unknown',
      }}
    />
  ))
  .add('simple: with series', () => (
    <SimpleTemplate
      argValue={defaultExpression}
      onValueChange={action('onValueChange')}
      resolved={{ labels: ['label1', 'label2'] }}
      workpad={getDefaultWorkpad()}
      typeInstance={{
        name: 'unknown',
      }}
    />
  ));
