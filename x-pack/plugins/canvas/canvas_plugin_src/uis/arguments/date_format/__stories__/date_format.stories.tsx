/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { action } from '@storybook/addon-actions';
import { DateFormatArgInput } from '../date_format';

const dateFormats = [
  { value: 'l', text: 'Shorthand' },
  { value: 'x', text: 'Unix' },
  { value: 'LLL', text: 'Longhand' },
];

export default {
  title: 'arguments/DateFormat',
};

export const WithNoFormat = () => (
  <DateFormatArgInput
    dateFormats={dateFormats}
    onValueChange={action('onValueChange')}
    argValue=""
    argId="DateFormatExample1"
    renderError={action('renderError')}
  />
);

WithNoFormat.story = {
  name: 'with no format',
};

export const WithPresetFormat = () => (
  <DateFormatArgInput
    dateFormats={dateFormats}
    onValueChange={action('onValueChange')}
    argValue="LLL"
    argId="DateFormatExample2"
    renderError={action('renderError')}
  />
);

WithPresetFormat.story = {
  name: 'with preset format',
};

export const WithCustomFormat = () => (
  <DateFormatArgInput
    dateFormats={dateFormats}
    onValueChange={action('onValueChange')}
    argValue="MM/DD/YYYY"
    argId="DateFormatExample3"
    renderError={action('renderError')}
  />
);

WithCustomFormat.story = {
  name: 'with custom format',
};
