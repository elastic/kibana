/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { ChromeOption } from '@kbn/investigate-plugin/public';
import { RegisterWidgetOptions } from '../register_widgets';
import { NOTE_WIDGET_NAME } from '../../constants';
import { NoteWidget } from '../../components/note_widget';

export function registerNoteWidget(options: RegisterWidgetOptions) {
  options.registerWidget(
    {
      type: NOTE_WIDGET_NAME,
      description: '',
      chrome: ChromeOption.disabled,
      schema: {
        type: 'object',
        properties: {
          note: {
            type: 'string',
          },
          user: {
            type: 'object',
            properties: {
              username: {
                type: 'string',
              },
              full_name: {
                type: 'string',
              },
            },
            required: ['username'],
          },
        },
        required: ['note', 'user'],
      } as const,
    },
    () => Promise.resolve({}),
    ({ widget, onDelete }) => {
      const { user, note } = widget.parameters;

      return <NoteWidget user={user} note={note} onDelete={onDelete} onChange={() => {}} />;
    }
  );
}
