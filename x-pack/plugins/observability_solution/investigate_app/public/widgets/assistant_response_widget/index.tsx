/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { TimelineAssistantResponse } from '../../components/timeline_message';
import { ASSISTANT_RESPONSE_WIDGET_NAME } from '../../constants';
import { RegisterWidgetOptions } from '../register_widgets';

export function registerAssistantResponseWidget(options: RegisterWidgetOptions) {
  options.dependencies.setup.investigate.registerWidget(
    {
      type: ASSISTANT_RESPONSE_WIDGET_NAME,
      description: '',
      chrome: 'disabled',
      schema: {
        type: 'object',
        properties: {
          content: {
            type: 'string',
          },
        },
        required: ['content'],
      } as const,
    },
    () => Promise.resolve({}),
    ({
      widget: {
        parameters: { content },
      },
      onDelete,
    }) => {
      return <TimelineAssistantResponse content={content} onDelete={onDelete} />;
    }
  );
}
