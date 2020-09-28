/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { ThemeProvider } from 'styled-components';
import { storiesOf, addDecorator } from '@storybook/react';
import { EuiTableFieldDataColumnType } from '@elastic/eui';
import euiLightVars from '@elastic/eui/dist/eui_theme_light.json';

import { ConditionsTable } from '.';

addDecorator((storyFn) => (
  <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>{storyFn()}</ThemeProvider>
));

interface TestItem {
  name: string;
  value: string;
}

const columns: Array<EuiTableFieldDataColumnType<TestItem>> = [
  { field: 'name', name: 'Name', textOnly: true, width: '50%' },
  { field: 'value', name: 'Value', textOnly: true, width: '50%' },
];

storiesOf('Components|ConditionsTable', module)
  .add('single item', () => {
    const items: TestItem[] = [{ name: 'item 1', value: 'value 1' }];

    return <ConditionsTable items={items} columns={columns} badge="and" />;
  })
  .add('and', () => {
    const items: TestItem[] = [
      { name: 'item 1', value: 'value 1' },
      { name: 'item 2', value: 'value 2' },
      { name: 'item 3', value: 'value 3' },
    ];

    return <ConditionsTable items={items} columns={columns} badge="and" />;
  })
  .add('or', () => {
    const items: TestItem[] = [
      { name: 'item 1', value: 'value 1' },
      { name: 'item 2', value: 'value 2' },
      { name: 'item 3', value: 'value 3' },
    ];

    return <ConditionsTable items={items} columns={columns} badge="or" />;
  });
