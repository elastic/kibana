/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Chance from 'chance';
import type { FtrProviderContext } from '../ftr_provider_context';

export function RandomProvider({ getService }: FtrProviderContext) {
  const log = getService('log');

  const seed = Date.now();
  log.debug('randomness seed: %j', seed);
  const chance = new Chance(seed);

  return new (class Randomness {
    int(min = 3, max = 15) {
      return chance.integer({ min, max });
    }

    id() {
      return chance.word({ length: this.int(10, 15) });
    }

    version() {
      return `v${this.int()}.${this.int()}.${this.int()}`;
    }

    text() {
      return chance.sentence({ words: this.int() });
    }

    longText() {
      return chance.paragraph();
    }

    pickOne(list: string[]) {
      return chance.pickone(list);
    }
  })();
}
