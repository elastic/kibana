/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ThemeProvider } from 'styled-components';
import { addDecorator } from '@storybook/react';
import { euiLightVars } from '@kbn/ui-theme';

import { createItems, TEST_COLUMNS } from './test_utils';
import { ConditionsTable } from '.';

addDecorator((storyFn) => (
  <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>{storyFn()}</ThemeProvider>
));

export default {
  title: 'Components/ConditionsTable',
};

export const SingleItem = () => {
  return <ConditionsTable items={createItems(1)} columns={TEST_COLUMNS} badge="and" />;
};

SingleItem.story = {
  name: 'single item',
};

export const And = () => {
  return <ConditionsTable items={createItems(3)} columns={TEST_COLUMNS} badge="and" />;
};

And.story = {
  name: 'and',
};

export const Or = () => {
  return <ConditionsTable items={createItems(3)} columns={TEST_COLUMNS} badge="or" />;
};

Or.story = {
  name: 'or',
};
