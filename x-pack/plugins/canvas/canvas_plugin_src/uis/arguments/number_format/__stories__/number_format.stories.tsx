import React from 'react';
import { action } from '@storybook/addon-actions';
import { NumberFormatArgInput } from '../number_format';

const numberFormats = [
  { value: '0.0[000]', text: 'Number' },
  { value: '0.0%', text: 'Percent' },
  { value: '$0.00', text: 'Currency' },
  { value: '00:00:00', text: 'Duration' },
  { value: '0.0b', text: 'Bytes' },
];

export default {
  title: 'arguments/NumberFormat',
};

export const WithNoFormat = {
  render: () => (
    <NumberFormatArgInput
      numberFormats={numberFormats}
      onValueChange={action('onValueChange')}
      argValue=""
      argId="NumberFormatExample1"
      renderError={action('renderError')}
    />
  ),

  name: 'with no format',
};

export const WithPresetFormat = {
  render: () => (
    <NumberFormatArgInput
      numberFormats={numberFormats}
      onValueChange={action('onValueChange')}
      argValue="$0.00"
      argId="NumberFormatExample2"
      renderError={action('renderError')}
    />
  ),

  name: 'with preset format',
};

export const WithCustomFormat = {
  render: () => (
    <NumberFormatArgInput
      numberFormats={numberFormats}
      onValueChange={action('onValueChange')}
      argValue="0.0[000]a"
      argId="NumberFormatExample3"
      renderError={action('renderError')}
    />
  ),

  name: 'with custom format',
};
