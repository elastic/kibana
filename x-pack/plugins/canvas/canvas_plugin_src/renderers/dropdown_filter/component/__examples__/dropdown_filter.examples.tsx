/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { action } from '@storybook/addon-actions';
import { storiesOf } from '@storybook/react';
import React from 'react';
import { DropdownFilter } from '../dropdown_filter';

const choices = ['Item One', 'Item Two', 'Item Three'];

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
