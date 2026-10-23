/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loadRrweb } from './load_rrweb';
import { createRrwebSessionFactory } from './replayer_session';
import type { ReplayerSessionFactory } from './types';
import { loadFixtureEvents } from '../test_helpers/load_fixture';
import {
  installIframeSandboxProperty,
  silenceJsdomScrollErrors,
} from '../test_helpers/jsdom_rrweb';
import { describeReplayerSessionContract } from './session_contract';

const events = loadFixtureEvents('checkout_flow');
const last = events[events.length - 1];

let factory: ReplayerSessionFactory;

beforeAll(async () => {
  installIframeSandboxProperty();
  silenceJsdomScrollErrors();
  factory = createRrwebSessionFactory(await loadRrweb());
});

afterAll(() => {
  jest.restoreAllMocks();
});

describeReplayerSessionContract('rrweb', () => factory, {
  events,
  laterEvent: { ...last, timestamp: last.timestamp + 60_000 },
  viewport: { width: 1000, height: 640 },
});

describe('rrweb replayer session', () => {
  const create = () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const session = factory({
      root,
      initialEvents: events,
      speed: 1,
      callbacks: { onFinish: jest.fn(), onViewportChange: jest.fn() },
    });
    return { root, session };
  };

  it('keeps rrweb default sandbox, which runs no script', () => {
    const { root, session } = create();
    session.pause(0);

    expect(root.querySelector('iframe')?.getAttribute('sandbox')).toBe('allow-same-origin');
    session.destroy();
  });

  it('shows a hatched pattern behind canvases through an injected style rule', async () => {
    const { root, session } = create();
    session.pause(0);
    await new Promise((resolve) => setTimeout(resolve, 50));

    const styleSheets = Array.from(
      root.querySelector('iframe')?.contentDocument?.styleSheets ?? []
    );
    const rules = styleSheets
      .flatMap((sheet) => Array.from(sheet.cssRules, (rule) => rule.cssText))
      .join('\n');

    expect(rules).toContain('repeating-linear-gradient');
    session.destroy();
  });
});
