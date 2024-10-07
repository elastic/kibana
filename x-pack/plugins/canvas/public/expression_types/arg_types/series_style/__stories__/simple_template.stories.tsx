/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { action } from '@storybook/addon-actions';
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

export default {
  title: 'arguments/SeriesStyle',

  decorators: [(story) => (
      <div style={{ width: '323px', padding: '16px', background: '#fff' }}>{story()}</div>
    )],
};

export const Simple = () => <Interactive />;

Simple.story = {
  name: 'simple',
};

export default {
  title: 'arguments/SeriesStyle/components',

  decorators: [(story) => (
      <div style={{ width: '323px', padding: '16px', background: '#fff' }}>{story()}</div>
    )],
};

export const SimpleNoLabels = () => (
    <SimpleTemplate
      argValue={defaultExpression}
      onValueChange={action('onValueChange')}
      workpad={getDefaultWorkpad()}
      resolved={{ labels: [] }}
      typeInstance={{
        name: 'defaultStyle',
      }}
    />
  );

SimpleNoLabels.story = {
  name: 'simple: no labels',
};

export const SimpleDefaults = () => (
    <SimpleTemplate
      argValue={defaultExpression}
      resolved={{ labels: ['label1', 'label2'] }}
      onValueChange={action('onValueChange')}
      workpad={getDefaultWorkpad()}
      typeInstance={{
        name: 'defaultStyle',
      }}
    />
  );

SimpleDefaults.story = {
  name: 'simple: defaults',
};

export const SimpleNoSeries = () => (
    <SimpleTemplate
      argValue={defaultExpression}
      resolved={{ labels: [] }}
      onValueChange={action('onValueChange')}
      workpad={getDefaultWorkpad()}
      typeInstance={{
        name: 'unknown',
      }}
    />
  );

SimpleNoSeries.story = {
  name: 'simple: no series',
};

export const SimpleWithSeries = () => (
    <SimpleTemplate
      argValue={defaultExpression}
      onValueChange={action('onValueChange')}
      resolved={{ labels: ['label1', 'label2'] }}
      workpad={getDefaultWorkpad()}
      typeInstance={{
        name: 'unknown',
      }}
    />
  );

SimpleWithSeries.story = {
  name: 'simple: with series',
};
