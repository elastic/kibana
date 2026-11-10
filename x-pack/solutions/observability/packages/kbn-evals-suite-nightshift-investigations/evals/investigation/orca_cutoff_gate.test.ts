/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createOrcaCutoffGate } from './orca_cutoff_gate';

/** Work that ends when the test says so, recording which key was in place while it ran. */
const createHarness = (concurrency: number) => {
  const events: string[] = [];
  let key: string | undefined;
  const ends = new Map<string, () => void>();
  const activate = jest.fn(async (cutoff: string) => {
    events.push(`activate ${cutoff}`);
    key = cutoff;
  });
  const gate = createOrcaCutoffGate({ activate, concurrency });
  const run = (cutoff: string, name: string) =>
    gate(cutoff, async () => {
      events.push(`start ${name}`);
      expect(key).toBe(cutoff);
      await new Promise<void>((resolve) => ends.set(name, resolve));
      expect(key).toBe(cutoff);
      events.push(`end ${name}`);
      return name;
    });
  const end = async (name: string) => {
    ends.get(name)?.();
    await flush();
  };
  return { events, activate, gate, run, end };
};

const flush = () => new Promise((resolve) => setImmediate(resolve));

describe('createOrcaCutoffGate', () => {
  it('runs one cutoff at a time, in the order its first work arrived', async () => {
    const { events, run, end } = createHarness(8);
    const results = [run('b', 'b1'), run('a', 'a1'), run('b', 'b2'), run('a', 'a2')];
    await flush();
    expect(events).toEqual(['activate b', 'start b1', 'start b2']);

    await end('b1');
    expect(events).not.toContain('activate a');
    await end('b2');
    await end('a1');
    await end('a2');

    await expect(Promise.all(results)).resolves.toEqual(['b1', 'a1', 'b2', 'a2']);
    expect(events).toEqual([
      'activate b',
      'start b1',
      'start b2',
      'end b1',
      'end b2',
      'activate a',
      'start a1',
      'start a2',
      'end a1',
      'end a2',
    ]);
  });

  it('runs at most `concurrency` pieces of work for a cutoff at once', async () => {
    const { events, run, end } = createHarness(2);
    const results = ['a1', 'a2', 'a3'].map((name) => run('a', name));
    await flush();
    expect(events.filter((event) => event.startsWith('start'))).toEqual(['start a1', 'start a2']);

    await end('a1');
    expect(events).toContain('start a3');
    await end('a2');
    await end('a3');
    await Promise.all(results);
  });

  it('frees the slot of work that throws', async () => {
    const { gate, events, run, end } = createHarness(1);
    const failed = gate('a', async () => {
      throw new Error('broken');
    });
    const next = run('b', 'b1');

    await expect(failed).rejects.toThrow('broken');
    await flush();
    expect(events).toEqual(['activate a', 'activate b', 'start b1']);
    await end('b1');
    await expect(next).resolves.toBe('b1');
  });

  it("fails a cutoff's work when its key cannot be put in place, and moves on", async () => {
    const { activate, gate, events } = createHarness(8);
    activate.mockRejectedValueOnce(new Error('connector write failed'));
    const first = gate('a', async () => 'never');
    const second = gate('a', async () => 'never');
    const other = gate('b', async () => {
      events.push('ran b');
      return 'b';
    });

    await expect(first).rejects.toThrow('connector write failed');
    await expect(second).rejects.toThrow('connector write failed');
    await expect(other).resolves.toBe('b');
    expect(events).toEqual(['activate b', 'ran b']);
  });
});
