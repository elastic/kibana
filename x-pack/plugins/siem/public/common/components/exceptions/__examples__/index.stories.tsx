/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { storiesOf } from '@storybook/react';
import React from 'react';
import { ThemeProvider } from 'styled-components';
import euiDarkVars from '@elastic/eui/dist/eui_theme_dark.json';

import { ExceptionItem } from '../viewer';
import { ExceptionListItemSchema, Operator } from '../types';

const getMockExceptionItem = (): ExceptionListItemSchema => ({
  id: '[insert_uuid_here]',
  item_id: 'item-id',
  created_at: '2020-04-23T00:19:13.289Z',
  created_by: 'user_name',
  list_id: 'test-exception',
  tie_breaker_id: '77fd1909-6786-428a-a671-30229a719c1f',
  updated_at: '2020-04-23T00:19:13.289Z',
  updated_by: 'user_name',
  name: '',
  description: '',
  comments: [],
  tags: [],
  _tags: [],
  type: 'simple',
  namespace_type: 'single',
  entries: [
    {
      field: 'actingProcess.file.signer',
      type: 'match',
      operator: Operator.INCLUSION,
      value: 'Elastic, N.V.',
    },
    {
      field: 'host.name',
      type: 'match',
      operator: Operator.EXCLUSION,
      value: 'Global Signer',
    },
  ],
});

storiesOf('components/exceptions', module)
  .add('ExceptionItem', () => {
    const payload = getMockExceptionItem();
    return (
      <ThemeProvider theme={() => ({ eui: euiDarkVars, darkMode: true })}>
        <ExceptionItem exceptionItem={payload} handleDelete={() => {}} handleEdit={() => {}} />
      </ThemeProvider>
    );
  })
  .add('with os', () => {
    const payload = getMockExceptionItem();
    payload._tags = ['os:mac,windows'];
    return (
      <ThemeProvider theme={() => ({ eui: euiDarkVars, darkMode: true })}>
        <ExceptionItem exceptionItem={payload} handleDelete={() => {}} handleEdit={() => {}} />
      </ThemeProvider>
    );
  })
  .add('with description', () => {
    const payload = getMockExceptionItem();
    payload.description = 'This is my description';
    return (
      <ThemeProvider theme={() => ({ eui: euiDarkVars, darkMode: true })}>
        <ExceptionItem exceptionItem={payload} handleDelete={() => {}} handleEdit={() => {}} />
      </ThemeProvider>
    );
  })
  .add('with comments', () => {
    const payload = getMockExceptionItem();
    payload.comments = [
      {
        user: 'yoshi',
        timestamp: '2020-04-23T00:19:13.289Z',
        comment: 'Comment goes here',
      },
      {
        user: 'elastic',
        timestamp: '2020-04-23T00:19:13.289Z',
        comment:
          'Doggo ipsum he made many woofs fluffer pats fat boi you are doing me a frighten very good spot, doggo super chub tungg most angery pupper I have ever seen. Porgo the neighborhood pupper such treat puggorino thicc, wrinkler big ol. Very good spot big ol adorable doggo, borking doggo. Wrinkler long doggo ur givin me a spook pupperino floofs most angery pupper I have ever seen boof many pats doge, porgo long doggo doing me a frighten smol mlem maximum borkdrive super chub. Mlem clouds many pats pats what a nice floof, heckin noodle horse.',
      },
    ];
    return (
      <ThemeProvider theme={() => ({ eui: euiDarkVars, darkMode: true })}>
        <ExceptionItem exceptionItem={payload} handleDelete={() => {}} handleEdit={() => {}} />
      </ThemeProvider>
    );
  })
  .add('with nested entries', () => {
    const payload = getMockExceptionItem();
    payload.entries = [
      {
        field: 'actingProcess.file.signer',
        type: 'match',
        operator: Operator.INCLUSION,
        value: 'Elastic, N.V.',
      },
      {
        field: 'host.name',
        type: 'match',
        operator: Operator.EXCLUSION,
        value: 'Global Signer',
      },
      {
        field: 'file.signature',
        type: 'nested',
        entries: [
          {
            field: 'signer',
            type: 'match',
            operator: Operator.INCLUSION,
            value: 'Evil',
          },
          {
            field: 'trusted',
            type: 'match',
            operator: Operator.INCLUSION,
            value: 'true',
          },
        ],
      },
    ];
    return (
      <ThemeProvider theme={() => ({ eui: euiDarkVars, darkMode: true })}>
        <ExceptionItem exceptionItem={payload} handleDelete={() => {}} handleEdit={() => {}} />
      </ThemeProvider>
    );
  })
  .add('with everything', () => {
    const payload = getMockExceptionItem();
    payload._tags = ['os:mac,windows'];
    payload.description = 'This is my description';
    payload.comments = [
      {
        user: 'yoshi',
        timestamp: '2020-04-23T00:19:13.289Z',
        comment: 'Comment goes here',
      },
      {
        user: 'elastic',
        timestamp: '2020-04-23T00:19:13.289Z',
        comment:
          'Doggo ipsum he made many woofs fluffer pats fat boi you are doing me a frighten very good spot, doggo super chub tungg most angery pupper I have ever seen. Porgo the neighborhood pupper such treat puggorino thicc, wrinkler big ol. Very good spot big ol adorable doggo, borking doggo. Wrinkler long doggo ur givin me a spook pupperino floofs most angery pupper I have ever seen boof many pats doge, porgo long doggo doing me a frighten smol mlem maximum borkdrive super chub. Mlem clouds many pats pats what a nice floof, heckin noodle horse.',
      },
    ];
    payload.entries = [
      {
        field: 'actingProcess.file.signer',
        type: 'match',
        operator: Operator.INCLUSION,
        value: 'Elastic, N.V.',
      },
      {
        field: 'host.name',
        type: 'match',
        operator: Operator.EXCLUSION,
        value: 'Global Signer',
      },
      {
        field: 'file.signature',
        type: 'nested',
        entries: [
          {
            field: 'signer',
            type: 'match',
            operator: Operator.INCLUSION,
            value: 'Evil',
          },
          {
            field: 'trusted',
            type: 'match',
            operator: Operator.INCLUSION,
            value: 'true',
          },
        ],
      },
    ];
    return (
      <ThemeProvider theme={() => ({ eui: euiDarkVars, darkMode: true })}>
        <ExceptionItem exceptionItem={payload} handleDelete={() => {}} handleEdit={() => {}} />
      </ThemeProvider>
    );
  });
