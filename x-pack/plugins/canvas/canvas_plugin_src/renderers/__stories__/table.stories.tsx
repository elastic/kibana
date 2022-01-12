/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { storiesOf } from '@storybook/react';
import { getTableRenderer } from '../table';
import { Render } from './render';

storiesOf('renderers/table', module).add('default', () => {
  const config = {
    paginate: true,
    perPage: 5,
    showHeader: true,
    datatable: {
      type: 'datatable' as 'datatable',
      columns: [
        {
          name: 'Foo',
          type: 'string' as 'string',
          id: 'id-foo',
          meta: { type: 'string' as 'string' },
        },
        {
          name: 'Bar',
          type: 'number' as 'number',
          id: 'id-bar',
          meta: { type: 'string' as 'string' },
        },
      ],
      rows: [
        { Foo: 'a', Bar: 700 },
        { Foo: 'b', Bar: 600 },
        { Foo: 'c', Bar: 500 },
        { Foo: 'd', Bar: 400 },
        { Foo: 'e', Bar: 300 },
        { Foo: 'f', Bar: 200 },
        { Foo: 'g', Bar: 100 },
      ],
    },
  };
  return <Render renderer={getTableRenderer()} config={config} width="400px" />;
});
