/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { action } from '@storybook/addon-actions';
import { DropdownFilter } from '../dropdown_filter';

const choices: Array<[string, string]> = [
  ['1', 'Item One'],
  ['2', 'Item Two'],
  ['3', 'Item Three'],
];

export default {
  title: 'renderers/DropdownFilter',
};

export const Default = () => <DropdownFilter commit={action('commit')} />;

Default.story = {
  name: 'default',
};

export const WithNewValue = () => (
  <DropdownFilter commit={action('commit')} initialValue="selectedValue" />
);

WithNewValue.story = {
  name: 'with new value',
};

export const WithChoices = () => <DropdownFilter commit={action('commit')} choices={choices} />;

WithChoices.story = {
  name: 'with choices',
};

export const WithChoicesAndValue = () => (
  <DropdownFilter commit={action('commit')} choices={choices} initialValue="Item Two" />
);

WithChoicesAndValue.story = {
  name: 'with choices and value',
};

export const WithChoicesAndNewValue = () => (
  <DropdownFilter commit={action('commit')} choices={choices} initialValue="selectedValue" />
);

WithChoicesAndNewValue.story = {
  name: 'with choices and new value',
};
