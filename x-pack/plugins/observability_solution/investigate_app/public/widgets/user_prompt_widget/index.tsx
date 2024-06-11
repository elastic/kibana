/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { ChromeOption } from '@kbn/investigate-plugin/public';
import { TimelineUserPrompt } from '../../components/timeline_message';
import { USER_PROMPT_WIDGET_NAME } from '../../constants';
import { RegisterWidgetOptions } from '../register_widgets';

export function registerUserPromptWidget(options: RegisterWidgetOptions) {
  options.registerWidget(
    {
      type: USER_PROMPT_WIDGET_NAME,
      description: '',
      chrome: ChromeOption.disabled,
      schema: {
        type: 'object',
        properties: {
          prompt: {
            type: 'string',
          },
          user: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
              },
            },
            required: ['name'],
          },
        },
        required: ['prompt', 'user'],
      } as const,
    },
    () => Promise.resolve({}),
    ({
      widget: {
        parameters: { prompt, user },
      },
      onDelete,
    }) => {
      return <TimelineUserPrompt prompt={prompt} user={user} onDelete={onDelete} />;
    }
  );
}
