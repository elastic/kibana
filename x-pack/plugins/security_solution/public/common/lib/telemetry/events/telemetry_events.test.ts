/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { telemetryEvents } from './telemetry_events';

describe('telemetry events', () => {
  it('ensure properties have consistent types', () => {
    const propertyTypes: Record<string, string> = {};
    telemetryEvents.forEach((event) => {
      expect(event).toHaveProperty('eventType');
      expect(event).toHaveProperty('schema'); // schema is an object
      Object.keys(event.schema).forEach((item) => {
        // @ts-ignore
        const eventType = event.schema[item].type;
        if (!propertyTypes[item]) {
          propertyTypes[item] = eventType;
        } else {
          expect(propertyTypes[item]).toEqual(eventType);
        }
      });
    });
  });
});
