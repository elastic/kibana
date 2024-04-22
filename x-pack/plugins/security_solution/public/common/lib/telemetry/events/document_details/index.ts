/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TelemetryEvent } from '../../types';
import { TelemetryEventTypes } from '../../constants';

export const DocumentDetailsFlyoutOpenedEvent: TelemetryEvent = {
  eventType: TelemetryEventTypes.DetailsFlyoutOpened,
  schema: {
    location: {
      type: 'text',
      _meta: {
        description: 'Table ID',
        optional: false,
      },
    },
    panel: {
      type: 'keyword',
      _meta: {
        description: 'Panel (left|right|preview)',
        optional: false,
      },
    },
  },
};

export const DocumentDetailsTabClickedEvent: TelemetryEvent = {
  eventType: TelemetryEventTypes.DetailsFlyoutTabClicked,
  schema: {
    location: {
      type: 'text',
      _meta: {
        description: 'Table ID',
        optional: false,
      },
    },
    panel: {
      type: 'keyword',
      _meta: {
        description: 'Panel (left|right)',
        optional: false,
      },
    },
    tabId: {
      type: 'keyword',
      _meta: {
        description: 'Tab ID',
        optional: false,
      },
    },
  },
};
