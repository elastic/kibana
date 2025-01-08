/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ShortIdTable } from './short_id_table';

describe('shortIdTable', () => {
  it('generates at least 10k unique ids consistently', () => {
    const ids = new Set();

    const table = new ShortIdTable();

    let i = 10_000;
    while (i--) {
      const id = table.take(String(i));
      ids.add(id);
    }

    expect(ids.size).toBe(10_000);
  });

  it('returns the original id based on the generated id', () => {
    const table = new ShortIdTable();

    const idsByOriginal = new Map<string, string>();

    let i = 100;
    while (i--) {
      const id = table.take(String(i));
      idsByOriginal.set(String(i), id);
    }

    expect(idsByOriginal.size).toBe(100);

    expect(() => {
      Array.from(idsByOriginal.entries()).forEach(([originalId, shortId]) => {
        const returnedOriginalId = table.lookup(shortId);
        if (returnedOriginalId !== originalId) {
          throw Error(
            `Expected shortId ${shortId} to return ${originalId}, but ${returnedOriginalId} was returned instead`
          );
        }
      });
    }).not.toThrow();
  });
});
