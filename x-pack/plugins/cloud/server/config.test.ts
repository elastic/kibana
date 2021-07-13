/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { config } from './config';

describe('xpack.cloud config', () => {
  describe('full_story', () => {
    it('allows org_id when enabled: false', () => {
      expect(() =>
        config.schema.validate({ full_story: { enabled: false, org_id: 'asdf' } })
      ).not.toThrow();
    });

    it('rejects undefined or empty org_id when enabled: true', () => {
      expect(() =>
        config.schema.validate({ full_story: { enabled: true } })
      ).toThrowErrorMatchingInlineSnapshot(
        `"[full_story.org_id]: expected value of type [string] but got [undefined]"`
      );
      expect(() =>
        config.schema.validate({ full_story: { enabled: true, org_id: '' } })
      ).toThrowErrorMatchingInlineSnapshot(
        `"[full_story.org_id]: value has length [0] but it must have a minimum length of [1]."`
      );
    });

    it('accepts org_id when enabled: true', () => {
      expect(() =>
        config.schema.validate({ full_story: { enabled: true, org_id: 'asdf' } })
      ).not.toThrow();
    });
  });
});
