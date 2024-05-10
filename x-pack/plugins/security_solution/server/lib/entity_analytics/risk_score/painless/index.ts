/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs';

const PHASES = ['init', 'map', 'combine', 'reduce'] as const;

type Phase = typeof PHASES[number];
export type PainlessScripts = Record<Phase, string>;

const readScript = (phase: Phase) =>
  fs.promises.readFile(`${__dirname}/risk_scoring_${phase}.painless`, 'utf8');

let cache: PainlessScripts | undefined;

export const getPainlessScripts = async (): Promise<PainlessScripts> => {
  if (cache) {
    return cache;
  }

  const [init, map, combine, reduce] = await Promise.all(PHASES.map(readScript));

  // The cache will only ever have one value, so we can safely update it
  // un-atomicly without worrying about lost updates.
  // eslint-disable-next-line require-atomic-updates
  cache = { init, map, combine, reduce };
  return cache;
};
