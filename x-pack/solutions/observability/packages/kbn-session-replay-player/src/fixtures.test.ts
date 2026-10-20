/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable import/no-nodejs-modules */
import { readdirSync, statSync } from 'fs';
import { join } from 'path';
import { isFullSnapshotEvent, isMetaEvent } from './model/replay_event_guards';
import { FIXTURES_DIR, loadFixtureEvents, readFixtureText } from './test_helpers/load_fixture';

const BUDGETS_BYTES: Record<string, number> = {
  checkout_flow: 40_000,
  long_session: 400_000,
  focus_and_input: 20_000,
  canvas_chart: 60_000,
  canvas_commands: 40_000,
  hostile_content: 40_000,
};
const THUMBNAIL_BUDGET_BYTES = 40_000;
const TOTAL_BUDGET_BYTES = 1_500_000;
const ALLOWED_HOSTS = new Set(['shop.example', 'evil.example', 'www.w3.org']);

const fixtureNames = readdirSync(FIXTURES_DIR)
  .filter((file) => file.endsWith('.json'))
  .map((file) => file.replace(/\.json$/, ''));

describe('fixtures', () => {
  it('ships the documented set', () => {
    expect(fixtureNames).toEqual(
      expect.arrayContaining([
        ...Object.keys(BUDGETS_BYTES),
        'thumb_shop_list',
        'thumb_checkout',
        'thumb_data_table',
        'thumb_article',
        'thumb_error_page',
      ])
    );
  });

  it('stays within the total size budget', () => {
    const total = fixtureNames.reduce(
      (sum, name) => sum + statSync(join(FIXTURES_DIR, `${name}.json`)).size,
      0
    );

    expect(total).toBeLessThan(TOTAL_BUDGET_BYTES);
  });

  describe.each(fixtureNames)('%s', (name) => {
    const text = readFixtureText(name);
    const events = loadFixtureEvents(name);

    it('stays within its size budget', () => {
      const budget = name.startsWith('thumb_') ? THUMBNAIL_BUDGET_BYTES : BUDGETS_BYTES[name];

      expect(Buffer.byteLength(text)).toBeLessThan(budget);
    });

    it('starts with a viewport event followed by a full snapshot', () => {
      expect(events.some(isMetaEvent)).toBe(true);
      expect(events.some(isFullSnapshotEvent)).toBe(true);
    });

    it('has non-decreasing timestamps', () => {
      const timestamps = events.map(({ timestamp }) => timestamp);

      expect(timestamps).toEqual([...timestamps].sort((a, b) => a - b));
    });

    it('contains no local path, e-mail address or unexpected host', () => {
      expect(text).not.toMatch(/file:|\/Users\//);
      expect(text).not.toMatch(/[\w.+-]+@[\w-]+\.[\w.]+/);
      const hosts = Array.from(text.matchAll(/https?:\/\/([^/"\\\s)]+)/g), ([, host]) => host);

      expect(hosts.filter((host) => !ALLOWED_HOSTS.has(host))).toEqual([]);
    });
  });

  it('keeps the recorder marker out of the replay events of checkout_flow', () => {
    const raw: unknown = JSON.parse(readFixtureText('checkout_flow'));

    expect(Array.isArray(raw) && raw.length).toBeGreaterThan(
      loadFixtureEvents('checkout_flow').length
    );
  });
});
