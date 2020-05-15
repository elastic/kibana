/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { storiesOf } from '@storybook/react';
import React from 'react';
import { action } from '@storybook/addon-actions';
import { DateFormatArgInput } from '../date_format';

const dateFormats = [
  { value: 'l', text: 'Shorthand' },
  { value: 'x', text: 'Unix' },
  { value: 'LLL', text: 'Longhand' },
];

storiesOf('arguments/DateFormat', module)
  .add('with no format', () => (
    <DateFormatArgInput
      dateFormats={dateFormats}
      onValueChange={action('onValueChange')}
      argValue=""
      argId="DateFormatExample1"
      renderError={action('renderError')}
    />
  ))
  .add('with preset format', () => (
    <DateFormatArgInput
      dateFormats={dateFormats}
      onValueChange={action('onValueChange')}
      argValue="LLL"
      argId="DateFormatExample2"
      renderError={action('renderError')}
    />
  ))
  .add('with custom format', () => (
    <DateFormatArgInput
      dateFormats={dateFormats}
      onValueChange={action('onValueChange')}
      argValue="MM/DD/YYYY"
      argId="DateFormatExample3"
      renderError={action('renderError')}
    />
  ));
