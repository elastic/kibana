/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EventTypeOpts } from '@kbn/core/public';
import { EVENT_TYPE } from '../types';

export const getEventTypes = () => {
  const eventTypes: Array<EventTypeOpts<Record<string, unknown>>> = [
    {
      eventType: EVENT_TYPE.SEARCH_BLUR,
      schema: {
        focus_time_ms: {
          type: 'long',
          _meta: {
            description:
              'The length in milliseconds the user viewed the global search bar before closing.',
          },
        },
      },
    },
    {
      eventType: EVENT_TYPE.CLICK_APPLICATION,
      schema: {
        application: {
          type: 'keyword',
          _meta: {
            description: 'The name of the application selected in the global search bar results.',
          },
        },
        terms: { type: 'keyword', _meta: { description: 'The search terms entered by the user.' } },
      },
    },
    {
      eventType: EVENT_TYPE.CLICK_SAVED_OBJECT,
      schema: {
        savedObjectType: {
          type: 'keyword',
          _meta: {
            description: 'The type of the saved object selected in the global search bar results.',
          },
        },
        terms: { type: 'keyword', _meta: { description: 'The search terms entered by the user.' } },
      },
    },
    {
      eventType: EVENT_TYPE.ERROR,
      schema: {
        application: {
          type: 'keyword',
          _meta: { description: 'A message from an error that was caught.' },
        },
        terms: { type: 'keyword', _meta: { description: 'The search terms entered by the user.' } },
      },
    },
  ];
  return eventTypes;
};
