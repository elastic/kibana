/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Runs `work` once its cutoff's key is on the ORCA connector, and keeps it there until it ends. */
export type OrcaCutoffGate = <T>(cutoff: string, work: () => Promise<T>) => Promise<T>;

/**
 * Runs ORCA investigations one cutoff at a time. Nightshift runs only in the default space, whose
 * investigator reads ORCA through one connector, so that connector holds one cutoff's key while
 * any investigation reads with it. Work for another cutoff waits until the running work is done;
 * `activate` then puts its cutoff's key in place. Cutoffs take turns in the order their first work
 * arrived, and at most `concurrency` pieces of work run at once.
 */
export const createOrcaCutoffGate = ({
  activate,
  concurrency,
}: {
  activate: (cutoff: string) => Promise<void>;
  concurrency: number;
}): OrcaCutoffGate => {
  const waiting: Array<{ cutoff: string; start: () => void; fail: (error: unknown) => void }> = [];
  let active: string | undefined;
  let running = 0;
  let switching = false;

  const take = (cutoff: string) => {
    const index = waiting.findIndex((entry) => entry.cutoff === cutoff);
    return index === -1 ? undefined : waiting.splice(index, 1)[0];
  };

  const pump = (): void => {
    if (switching) return;
    while (active !== undefined && running < concurrency) {
      const entry = take(active);
      if (!entry) break;
      running += 1;
      entry.start();
    }
    if (running > 0 || waiting.length === 0) return;
    const [{ cutoff }] = waiting;
    switching = true;
    activate(cutoff)
      .then(
        () => {
          active = cutoff;
        },
        (error: unknown) => {
          // No key reads up to this cutoff, so none of its work can run.
          active = undefined;
          for (let entry = take(cutoff); entry; entry = take(cutoff)) entry.fail(error);
        }
      )
      .finally(() => {
        switching = false;
        pump();
      });
  };

  return async (cutoff, work) => {
    await new Promise<void>((start, fail) => {
      waiting.push({ cutoff, start, fail });
      pump();
    });
    try {
      return await work();
    } finally {
      running -= 1;
      pump();
    }
  };
};
