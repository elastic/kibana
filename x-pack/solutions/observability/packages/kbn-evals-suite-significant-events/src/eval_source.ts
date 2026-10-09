/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setTimeout as delay } from 'timers/promises';
import type { HttpHandler } from '@kbn/core/public';
import type { NightshiftSource } from '@kbn/nightshift-shared';
import { KIS_ONBOARDING_IN_PROGRESS_STATUSES } from '@kbn/significant-events-schema';
import type { SignificantEventsWorkflowStatus } from '@kbn/significant-events-schema';

const FENCE_TIMEOUT_MS = 120_000;
const FENCE_POLL_INTERVAL_MS = 1_000;

const isConflict = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  'response' in error &&
  typeof error.response === 'object' &&
  error.response !== null &&
  'status' in error.response &&
  error.response.status === 409;

const hasWorkflowStatus = (value: unknown): value is { status: SignificantEventsWorkflowStatus } =>
  typeof value === 'object' && value !== null && 'status' in value;

/**
 * Keeps the automatic onboarding of a new source out of an evaluation. Creating a source queues a
 * reconcile that schedules a one-time onboarding run, and that run writes knowledge indicators to
 * the source while the evaluation seeds it: the seed then hits lease conflicts or is mixed with
 * generated indicators.
 *
 * The reconcile is applied here first, so it is settled and will not start the run later. Then the
 * run it started is cancelled, and the source is only returned once nothing is running on it.
 */
const fenceAutomaticOnboarding = async ({
  fetch,
  source,
}: {
  fetch: HttpHandler;
  source: NightshiftSource;
}): Promise<void> => {
  const deadline = Date.now() + FENCE_TIMEOUT_MS;

  // A 409 means the queued reconcile holds the source's write lease. Retry until it lets go.
  for (;;) {
    try {
      await fetch(`/internal/streams/${source.id}/_reconcile_source`, {
        method: 'POST',
        body: JSON.stringify({ sourceSlug: source.slug }),
      });
      break;
    } catch (error) {
      if (!isConflict(error) || Date.now() >= deadline) {
        throw error;
      }
      await delay(FENCE_POLL_INTERVAL_MS);
    }
  }

  await fetch(`/internal/streams/${source.id}/onboarding/_execute`, {
    method: 'POST',
    body: JSON.stringify({ action: 'cancel' }),
  });

  for (;;) {
    const status = await fetch<unknown>(`/internal/streams/${source.id}/onboarding/_status`, {
      method: 'GET',
    });
    if (!hasWorkflowStatus(status) || !KIS_ONBOARDING_IN_PROGRESS_STATUSES.has(status.status)) {
      return;
    }
    if (Date.now() >= deadline) {
      throw new Error(`Onboarding of source ${source.id} is still running after being cancelled`);
    }
    await delay(FENCE_POLL_INTERVAL_MS);
  }
};

/**
 * Creates a catalog source and its ES|QL view for an evaluation dataset. The source is returned
 * once its automatic onboarding is out of the way, so the evaluation can seed it undisturbed.
 */
export const createEvalSource = async ({
  fetch,
  title,
  esql,
}: {
  fetch: HttpHandler;
  title: string;
  esql: string;
}): Promise<NightshiftSource> => {
  const { source } = await fetch<{ source: NightshiftSource }>('/internal/nightshift/sources', {
    method: 'POST',
    body: JSON.stringify({ title, esql }),
  });
  await fenceAutomaticOnboarding({ fetch, source });
  return source;
};

/** Removes the source and its view after the evaluation completes. */
export const deleteEvalSource = async ({
  fetch,
  source,
}: {
  fetch: HttpHandler;
  source: NightshiftSource;
}): Promise<void> => {
  await fetch(`/internal/nightshift/sources/${source.id}`, { method: 'DELETE' });
};
