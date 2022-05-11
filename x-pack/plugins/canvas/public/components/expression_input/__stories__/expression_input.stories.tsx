/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { action } from '@storybook/addon-actions';
import { storiesOf } from '@storybook/react';
import React from 'react';
import { ExpressionFunction, ExpressionFunctionParameter, Style } from '@kbn/expressions-plugin';

import { registerExpressionsLanguage } from '@kbn/presentation-util-plugin/public';
import { ExpressionInput } from '../expression_input';

const content: ExpressionFunctionParameter<'string'> = {
  name: 'content',
  required: false,
  help: 'A string of text that contains Markdown. To concatenate, pass the `string` function multiple times.',
  types: ['string'],
  default: '',
  aliases: ['_', 'expression'],
  multi: true,
  resolve: false,
  options: [],
  accepts: () => true,
};

const font: ExpressionFunctionParameter<Style> = {
  name: 'font',
  required: false,
  help: 'The CSS font properties for the content. For example, font-family or font-weight.',
  types: ['style'],
  default: '{font}',
  aliases: [],
  multi: false,
  resolve: true,
  options: [],
  accepts: () => true,
};

const sampleFunctionDef = {
  name: 'markdown',
  type: 'render',
  aliases: [],
  help: 'Adds an element that renders Markdown text. TIP: Use the `markdown` function for single numbers, metrics, and paragraphs of text.',
  args: {
    content,
    font,
  },

  fn: () => ({
    as: 'markdown',
    value: true,
    type: 'render',
  }),
} as unknown as ExpressionFunction;

registerExpressionsLanguage([sampleFunctionDef]);

storiesOf('components/ExpressionInput', module).add('default', () => (
  <ExpressionInput
    expression="markdown"
    isCompact={true}
    onChange={action('onChange')}
    expressionFunctions={[sampleFunctionDef as any]}
  />
));
