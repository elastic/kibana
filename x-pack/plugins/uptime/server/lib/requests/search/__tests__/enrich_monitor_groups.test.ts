/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { sortChecksBy } from '../enrich_monitor_groups';

describe('enrich monitor groups', () => {
  describe('sortChecksBy', () => {
    it('identifies lesser geo name', () => {
      expect(
        sortChecksBy(
          { observer: { geo: { name: 'less' } }, monitor: { status: 'up' } },
          { observer: { geo: { name: 'more' } }, monitor: { status: 'up' } }
        )
      ).toBe(-1);
    });

    it('identifies greater geo name', () => {
      expect(
        sortChecksBy(
          { observer: { geo: { name: 'more' } }, monitor: { status: 'up' } },
          { observer: { geo: { name: 'less' } }, monitor: { status: 'up' } }
        )
      ).toBe(1);
    });

    it('identifies equivalent geo name and sorts by lesser ip', () => {
      expect(
        sortChecksBy(
          { observer: { geo: { name: 'same' } }, monitor: { ip: '127.0.0.1', status: 'up' } },
          { observer: { geo: { name: 'same' } }, monitor: { ip: '127.0.0.2', status: 'up' } }
        )
      ).toBe(-1);
    });

    it('identifies equivalent geo name and sorts by greater ip', () => {
      expect(
        sortChecksBy(
          { observer: { geo: { name: 'same' } }, monitor: { ip: '127.0.0.2', status: 'up' } },
          { observer: { geo: { name: 'same' } }, monitor: { ip: '127.0.0.1', status: 'up' } }
        )
      ).toBe(1);
    });

    it('identifies equivalent geo name and sorts by equivalent ip', () => {
      expect(
        sortChecksBy(
          { observer: { geo: { name: 'same' } }, monitor: { ip: '127.0.0.1', status: 'up' } },
          { observer: { geo: { name: 'same' } }, monitor: { ip: '127.0.0.1', status: 'up' } }
        )
      ).toBe(0);
    });

    it('handles equivalent ip arrays', () => {
      expect(
        sortChecksBy(
          { observer: { geo: { name: 'same' } }, monitor: { ip: ['127.0.0.1'], status: 'up' } },
          { observer: { geo: { name: 'same' } }, monitor: { ip: ['127.0.0.1'], status: 'up' } }
        )
      ).toBe(0);
    });

    it('handles non-equal ip arrays', () => {
      expect(
        sortChecksBy(
          {
            observer: { geo: { name: 'same' } },
            monitor: { ip: ['127.0.0.2', '127.0.0.9'], status: 'up' },
          },
          {
            observer: { geo: { name: 'same' } },
            monitor: { ip: ['127.0.0.3', '127.0.0.1'], status: 'up' },
          }
        )
      ).toBe(1);
    });

    it('handles undefined observer fields', () => {
      expect(
        sortChecksBy(
          { observer: undefined, monitor: { ip: ['127.0.0.1'], status: 'up' } },
          { observer: { geo: { name: 'same' } }, monitor: { ip: ['127.0.0.1'], status: 'up' } }
        )
      ).toBe(-1);
    });

    it('handles undefined ip fields', () => {
      expect(
        sortChecksBy(
          { observer: { geo: { name: 'same' } }, monitor: { ip: undefined, status: 'up' } },
          { observer: { geo: { name: 'same' } }, monitor: { ip: ['127.0.0.1'], status: 'up' } }
        )
      ).toBe(-1);
    });
  });
});
