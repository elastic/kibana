/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ThemeProvider } from 'styled-components';
import { storiesOf, addDecorator } from '@storybook/react';
import { euiLightVars } from '@kbn/ui-theme';

import { createItems, TEST_COLUMNS } from './test_utils';
import { ConditionsTable } from '.';

addDecorator((storyFn) => (
  <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>{storyFn()}</ThemeProvider>
));

storiesOf('Components/ConditionsTable', module)
  .add('single item', () => {
    return <ConditionsTable items={createItems(1)} columns={TEST_COLUMNS} badge="and" />;
  })
  .add('and', () => {
    return <ConditionsTable items={createItems(3)} columns={TEST_COLUMNS} badge="and" />;
  })
  .add('or', () => {
    return <ConditionsTable items={createItems(3)} columns={TEST_COLUMNS} badge="or" />;
  });
