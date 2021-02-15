/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { action } from '@storybook/addon-actions';
import { storiesOf } from '@storybook/react';
import React from 'react';
import { DropdownFilter } from '../dropdown_filter';

const choices: Array<[string, string]> = [
  ['1', 'Item One'],
  ['2', 'Item Two'],
  ['3', 'Item Three'],
];

storiesOf('renderers/DropdownFilter', module)
  .add('default', () => <DropdownFilter onChange={action('onChange')} commit={action('commit')} />)
  .add('with new value', () => (
    <DropdownFilter onChange={action('onChange')} commit={action('commit')} value="selectedValue" />
  ))
  .add('with choices', () => (
    <DropdownFilter onChange={action('onChange')} commit={action('commit')} choices={choices} />
  ))
  .add('with choices and value', () => (
    <DropdownFilter
      onChange={action('onChange')}
      commit={action('commit')}
      choices={choices}
      value="Item Two"
    />
  ))
  .add('with choices and new value', () => (
    <DropdownFilter
      onChange={action('onChange')}
      commit={action('commit')}
      choices={choices}
      value="selectedValue"
    />
  ));
