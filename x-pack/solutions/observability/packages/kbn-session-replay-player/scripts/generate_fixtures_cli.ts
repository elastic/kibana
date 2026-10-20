/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable import/no-nodejs-modules */
import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import { chromium } from 'playwright';
import type { Page } from 'playwright';
import { run } from '@kbn/dev-cli-runner';
import { REPO_ROOT } from '@kbn/repo-info';
import { buildHostileEvents } from './hostile_events';

const PACKAGE_DIR = resolve(__dirname, '..');
const SOURCE_DIR = join(PACKAGE_DIR, 'fixtures', 'source');
const OUTPUT_DIR = join(PACKAGE_DIR, 'fixtures');
const RRWEB_UMD = join(REPO_ROOT, 'node_modules', 'rrweb', 'dist', 'rrweb.umd.cjs');

/** Recordings are shifted so the first event sits at this time, keeping regenerated files stable. */
const BASE_TIMESTAMP = 1_700_000_000_000;
const CHECKOUT_INTERVAL_MS = 5 * 60 * 1000;

/** The recorder's own defaults (elastic-otel-rum-js replay POC), so fixtures look like real data. */
const RECORDER_DEFAULTS = {
  maskAllInputs: true,
  blockClass: 'rum-block',
  inlineStylesheet: true,
  slimDOMOptions: true,
  checkoutEveryNms: CHECKOUT_INTERVAL_MS,
  recordCanvas: true,
  sampling: { mousemove: 50, scroll: 150, input: 'last', canvas: 2 },
};

type RecorderOptions =
  | typeof RECORDER_DEFAULTS
  | (Omit<typeof RECORDER_DEFAULTS, 'sampling'> & {
      sampling: { mousemove: number; scroll: number; input: string };
    });

interface TimedEvent {
  type: number;
  timestamp: number;
  data: unknown;
}

const isTimedEvent = (value: unknown): value is TimedEvent =>
  typeof value === 'object' &&
  value !== null &&
  'type' in value &&
  typeof value.type === 'number' &&
  'timestamp' in value &&
  typeof value.timestamp === 'number' &&
  'data' in value;

const pageUrl = (name: string): string => `file://${join(SOURCE_DIR, `${name}.html`)}`;

/** Records every document the page loads, so a journey that navigates produces one stream. */
const record = async (
  page: Page,
  options: RecorderOptions,
  journey: (page: Page) => Promise<void>
): Promise<TimedEvent[]> => {
  const events: unknown[] = [];
  await page.route(/^https?:/, (route) => route.abort());
  await page.exposeFunction('__emit', (event: unknown) => {
    events.push(event);
  });
  await page.addInitScript({
    content: `${readFileSync(RRWEB_UMD, 'utf8')}
window.addEventListener('load', () => {
  setTimeout(() => {
    window.rrweb.record({ ...${JSON.stringify(options)}, emit: (event) => window.__emit(event) });
  }, 0);
});`,
  });
  await journey(page);
  await page.waitForTimeout(400);
  return events.filter(isTimedEvent);
};

const normalize = (events: TimedEvent[]): TimedEvent[] => {
  const sorted = [...events].sort((a, b) => a.timestamp - b.timestamp);
  const shift = BASE_TIMESTAMP - (sorted[0]?.timestamp ?? BASE_TIMESTAMP);
  return sorted.map((event) => ({ ...event, timestamp: event.timestamp + shift }));
};

/** Moves every event after `afterMs` later in time, simulating the user going idle. */
const insertIdleGap = (events: TimedEvent[], afterMs: number, gapMs: number): TimedEvent[] =>
  events.map((event) =>
    event.timestamp - BASE_TIMESTAMP > afterMs
      ? { ...event, timestamp: event.timestamp + gapMs }
      : event
  );

const REPLAY_STARTED: TimedEvent = {
  type: 99,
  timestamp: BASE_TIMESTAMP,
  data: { name: 'replay-started' },
};

/** Repeats a short recording across about two hours, with a full snapshot at least every five minutes. */
const buildLongSession = (events: TimedEvent[]): TimedEvent[] => {
  const blockDuration = (events[events.length - 1]?.timestamp ?? BASE_TIMESTAMP) - BASE_TIMESTAMP;
  const blockCount = 12;
  const gap = 10 * 60 * 1000;
  const repeated: TimedEvent[] = [];
  for (let block = 0; block < blockCount; block++) {
    const shift = block * (blockDuration + gap);
    repeated.push(
      ...events
        .filter((event) => event.type !== 99)
        .map((event) => ({ ...event, timestamp: event.timestamp + shift }))
    );
  }
  return repeated;
};

const keepOnlyFirstFrame = (events: TimedEvent[]): TimedEvent[] => {
  const meta = events.find((event) => event.type === 4);
  const snapshot = events.find((event) => event.type === 2);
  return [meta, snapshot].filter((event): event is TimedEvent => event !== undefined);
};

/** Replaces the local file location of the source pages with the public addresses they stand for. */
const anonymizeLocations = (json: string): string =>
  json
    .replaceAll(`file://${SOURCE_DIR}/hostile.html`, 'https://evil.example/hostile.html')
    .replaceAll(`file://${SOURCE_DIR}/`, 'https://shop.example/');

const write = (name: string, events: unknown[]): number => {
  const body = `${anonymizeLocations(JSON.stringify(events))}\n`;
  writeFileSync(join(OUTPUT_DIR, `${name}.json`), body);
  return Buffer.byteLength(body);
};

const CLICK_ADD = '[data-add]';

export const SCENARIOS: Record<string, (page: Page) => Promise<TimedEvent[]>> = {
  checkout_flow: async (page) => {
    const recorded = await record(page, RECORDER_DEFAULTS, async (p) => {
      await p.goto(pageUrl('shop_list'));
      await p.waitForTimeout(300);
      await p.mouse.move(200, 220);
      await p.mouse.move(420, 300, { steps: 6 });
      await p.locator(CLICK_ADD).nth(0).click();
      await p.waitForTimeout(250);
      await p.evaluate('window.scrollTo(0, 220)');
      await p.waitForTimeout(250);
      await p.locator(CLICK_ADD).nth(2).click();
      await p.waitForTimeout(300);
      await p.click('nav a[href="checkout.html"]');
      await p.waitForSelector('#email');
      await p.fill('#email', 'masked@example.com');
      await p.fill('#password', 'not-a-real-password');
      await p.click('#pay');
      await p.waitForSelector('#status:not(:empty)');
    });
    const withGaps = insertIdleGap(insertIdleGap(normalize(recorded), 1200, 5000), 4200, 5000);
    return [REPLAY_STARTED, ...withGaps];
  },
  focus_and_input: async (page) =>
    normalize(
      await record(page, RECORDER_DEFAULTS, async (p) => {
        await p.goto(pageUrl('checkout'));
        await p.click('#email');
        await p.keyboard.type('someone@example.com', { delay: 15 });
        await p.click('#password');
        await p.keyboard.type('hunter2', { delay: 15 });
        await p.click('#card');
        await p.keyboard.type('4242424242424242', { delay: 10 });
        await p.click('body');
      })
    ),
  canvas_chart: async (page) =>
    normalize(
      await record(page, RECORDER_DEFAULTS, async (p) => {
        await p.goto(pageUrl('canvas_chart'));
        await p.waitForTimeout(2200);
      })
    ),
  canvas_commands: async (page) => {
    const { sampling, ...rest } = RECORDER_DEFAULTS;
    return normalize(
      await record(
        page,
        {
          ...rest,
          sampling: {
            mousemove: sampling.mousemove,
            scroll: sampling.scroll,
            input: sampling.input,
          },
        },
        async (p) => {
          await p.goto(pageUrl('canvas_chart'));
          await p.waitForTimeout(2200);
        }
      )
    );
  },
  hostile_content: async (page) => {
    const recorded = normalize(
      await record(page, RECORDER_DEFAULTS, async (p) => {
        await p.goto(pageUrl('hostile'));
        await p.waitForTimeout(400);
      })
    );
    const lastRecorded = recorded[recorded.length - 1]?.timestamp ?? BASE_TIMESTAMP;
    const handBuilt = buildHostileEvents(lastRecorded + 10_000).filter(isTimedEvent);
    return [...recorded, ...handBuilt];
  },
};

const THUMBNAIL_PAGES = ['shop_list', 'checkout', 'data_table', 'article', 'error_page'];

run(
  async ({ log, flags }) => {
    mkdirSync(OUTPUT_DIR, { recursive: true });
    const only = typeof flags.only === 'string' ? flags.only : undefined;
    const browser = await chromium.launch({
      headless: true,
      executablePath: process.env.CHROME_EXECUTABLE || undefined,
    });
    try {
      const names = Object.keys(SCENARIOS).filter((name) => !only || name === only);
      for (const name of names) {
        const context = await browser.newContext({ viewport: { width: 1000, height: 640 } });
        const events = await SCENARIOS[name](await context.newPage());
        await context.close();
        log.info(`${name}: ${events.length} events, ${write(name, events)} bytes`);
        if (name === 'checkout_flow') {
          log.info(`long_session: ${write('long_session', buildLongSession(events))} bytes`);
        }
      }
      if (!only || only.startsWith('thumb_')) {
        for (const pageName of THUMBNAIL_PAGES) {
          if (only && only !== `thumb_${pageName}`) {
            continue;
          }
          const context = await browser.newContext({ viewport: { width: 1000, height: 640 } });
          const page = await context.newPage();
          const recorded = normalize(
            await record(page, RECORDER_DEFAULTS, async (p) => {
              await p.goto(pageUrl(pageName));
              await p.waitForTimeout(300);
            })
          );
          await context.close();
          log.info(
            `thumb_${pageName}: ${write(`thumb_${pageName}`, keepOnlyFirstFrame(recorded))} bytes`
          );
        }
      }
    } finally {
      await browser.close();
    }
  },
  {
    description: 'Records the rrweb fixtures from the synthetic pages in fixtures/source.',
    flags: {
      string: ['only'],
      help: `
        --only <name>   Regenerate a single fixture (for example checkout_flow or thumb_shop_list).
      `,
    },
  }
);
