/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OpsgenieCloseAlertExample } from '../../../server/connector_types/opsgenie/test_schema';
import { isPartialCloseAlertSchema } from './close_alert_schema';

describe('close_alert_schema', () => {
  describe('isPartialCloseAlertSchema', () => {
    it('returns true with an empty object', () => {
      expect(isPartialCloseAlertSchema({})).toBeTruthy();
    });

    it('returns false with undefined', () => {
      expect(isPartialCloseAlertSchema(undefined)).toBeFalsy();
    });

    it('returns false with an invalid field', () => {
      expect(isPartialCloseAlertSchema({ invalidField: 'a' })).toBeFalsy();
    });

    it('returns true with only the note field', () => {
      expect(isPartialCloseAlertSchema({ note: 'a' })).toBeTruthy();
    });

    it('returns true with the Opsgenie close alert example', () => {
      expect(isPartialCloseAlertSchema(OpsgenieCloseAlertExample)).toBeTruthy();
    });
  });
});
