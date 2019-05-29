/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';
import { pure } from 'recompose';

import { NoteCard } from './note_card';
import * as i18n from './translations';

const Column = pure<{ text: string }>(({ text }) => <span>{text}</span>);

interface Item {
  created: Date;
  note: string;
  user: string;
}

interface Column {
  field: string;
  name: string;
  sortable: boolean;
  truncateText: boolean;
  render: (value: string, item: Item) => JSX.Element;
}

export const columns: Column[] = [
  {
    field: 'note',
    name: i18n.NOTE,
    sortable: true,
    truncateText: false,
    render: (_, { created, note, user }) => (
      <NoteCard created={created} rawNote={note} user={user} />
    ),
  },
];
