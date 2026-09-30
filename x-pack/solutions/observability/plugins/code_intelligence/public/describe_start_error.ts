/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import { EXTRACTION_BATCH_LOCK_ID } from '../common/extraction_lock_id';
import { START_EXTRACTION_ERROR_CODES } from '../common/start_extraction_errors';

export interface StartErrorDescription {
  readonly title: string;
  readonly explanation: string;
  readonly suggestions: readonly string[];
  /** The batch that is already running, when the server could name it. */
  readonly extractionId?: string;
}

interface ErrorBody {
  readonly message?: unknown;
  readonly attributes?: {
    readonly code?: unknown;
    readonly extractionId?: unknown;
    readonly repository?: unknown;
  };
}

/** Reads the parsed body of a Kibana `IHttpFetchError` without trusting its shape. */
const errorBody = (error: unknown): ErrorBody => {
  if (typeof error !== 'object' || error === null || !('body' in error)) return {};
  const { body } = error as { body?: unknown };
  return typeof body === 'object' && body !== null ? (body as ErrorBody) : {};
};

const nonEmpty = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim().length > 0 ? value : undefined;

const alreadyRunning = (extractionId?: string): StartErrorDescription => ({
  ...(extractionId === undefined ? {} : { extractionId }),
  title: i18n.translate('xpack.codeIntelligence.repositories.startError.alreadyRunning.title', {
    defaultMessage: 'An extraction batch is already running',
  }),
  explanation: i18n.translate(
    'xpack.codeIntelligence.repositories.startError.alreadyRunning.explanation',
    {
      defaultMessage:
        'Only one extraction batch can run at a time. The running batch may have been started in another tab, by another user, or on another Kibana instance, so it may not appear on this page.',
    }
  ),
  suggestions: [
    i18n.translate('xpack.codeIntelligence.repositories.startError.alreadyRunning.wait', {
      defaultMessage: 'Wait for the running batch to finish, then run it again.',
    }),
    i18n.translate('xpack.codeIntelligence.repositories.startError.alreadyRunning.otherTab', {
      defaultMessage: 'If you started it in another tab, follow its progress there.',
    }),
    i18n.translate('xpack.codeIntelligence.repositories.startError.alreadyRunning.crashed', {
      defaultMessage:
        'If Kibana restarted or stopped during the batch, the lock releases on its own within about 30 seconds. Try again after that.',
    }),
    i18n.translate('xpack.codeIntelligence.repositories.startError.alreadyRunning.staleLock', {
      defaultMessage:
        'If this keeps happening while no batch is running anywhere, ask an administrator to look for the lock named {lockId} in the Kibana locks index.',
      values: { lockId: EXTRACTION_BATCH_LOCK_ID },
    }),
  ],
});

const repositoryNotConfigured = (repository?: string): StartErrorDescription => ({
  title:
    repository === undefined
      ? i18n.translate(
          'xpack.codeIntelligence.repositories.startError.repositoryNotConfigured.titleUnnamed',
          { defaultMessage: 'A selected repository is no longer configured' }
        )
      : i18n.translate(
          'xpack.codeIntelligence.repositories.startError.repositoryNotConfigured.title',
          { defaultMessage: '{repository} is no longer configured', values: { repository } }
        ),
  explanation: i18n.translate(
    'xpack.codeIntelligence.repositories.startError.repositoryNotConfigured.explanation',
    {
      defaultMessage:
        'The repository settings no longer list this repository. Someone probably deleted it after this page loaded.',
    }
  ),
  suggestions: [
    i18n.translate(
      'xpack.codeIntelligence.repositories.startError.repositoryNotConfigured.reload',
      { defaultMessage: 'Reload the page to see the current list of repositories.' }
    ),
    i18n.translate(
      'xpack.codeIntelligence.repositories.startError.repositoryNotConfigured.addAgain',
      { defaultMessage: 'If the repository should be extracted, add it again with the form.' }
    ),
  ],
});

const noRepositories = (): StartErrorDescription => ({
  title: i18n.translate('xpack.codeIntelligence.repositories.startError.noRepositories.title', {
    defaultMessage: 'No repositories are enabled',
  }),
  explanation: i18n.translate(
    'xpack.codeIntelligence.repositories.startError.noRepositories.explanation',
    { defaultMessage: 'Running all repositories only includes the ones that are enabled.' }
  ),
  suggestions: [
    i18n.translate('xpack.codeIntelligence.repositories.startError.noRepositories.select', {
      defaultMessage: 'Select the repositories to run, or enable at least one repository.',
    }),
  ],
});

const sandboxUnavailable = (message?: string): StartErrorDescription => ({
  title: i18n.translate('xpack.codeIntelligence.repositories.startError.sandboxUnavailable.title', {
    defaultMessage: 'The sandbox is not available',
  }),
  explanation:
    message ??
    i18n.translate(
      'xpack.codeIntelligence.repositories.startError.sandboxUnavailable.explanation',
      {
        defaultMessage:
          'Extraction reads repositories inside the sandbox, and this deployment cannot reach it.',
      }
    ),
  suggestions: [
    i18n.translate('xpack.codeIntelligence.repositories.startError.sandboxUnavailable.configure', {
      defaultMessage:
        'Ask an administrator to configure {settings} in kibana.yml and restart Kibana.',
      values: { settings: 'xpack.sandbox' },
    }),
  ],
});

const capacityExhausted = (): StartErrorDescription => ({
  title: i18n.translate('xpack.codeIntelligence.repositories.startError.capacityExhausted.title', {
    defaultMessage: 'The batch could not be started because Kibana is busy',
  }),
  explanation: i18n.translate(
    'xpack.codeIntelligence.repositories.startError.capacityExhausted.explanation',
    {
      defaultMessage:
        'This Kibana instance keeps track of at most 100 extraction batches, and all of them are still running.',
    }
  ),
  suggestions: [
    i18n.translate('xpack.codeIntelligence.repositories.startError.capacityExhausted.wait', {
      defaultMessage: 'Wait for running batches to finish, then try again.',
    }),
    i18n.translate('xpack.codeIntelligence.repositories.startError.capacityExhausted.restart', {
      defaultMessage:
        'Restarting Kibana clears the tracked batches, but it also stops the one that is running.',
    }),
  ],
});

const unknownError = (message?: string): StartErrorDescription => ({
  title: i18n.translate('xpack.codeIntelligence.repositories.startError.unknown.title', {
    defaultMessage: 'The extraction batch could not be started',
  }),
  explanation:
    message ??
    i18n.translate('xpack.codeIntelligence.repositories.startError.unknown.explanation', {
      defaultMessage: 'Kibana did not say why. The server or the network may be unavailable.',
    }),
  suggestions: [
    i18n.translate('xpack.codeIntelligence.repositories.startError.unknown.retry', {
      defaultMessage: 'Try again in a moment.',
    }),
    i18n.translate('xpack.codeIntelligence.repositories.startError.unknown.checkLog', {
      defaultMessage: 'If it keeps failing, check the Kibana server log for the cause.',
    }),
  ],
});

/** Turns a failed batch start request into what went wrong, why, and what the user can do next. */
export const describeStartError = (error: unknown): StartErrorDescription => {
  const { message, attributes } = errorBody(error);
  switch (attributes?.code) {
    case START_EXTRACTION_ERROR_CODES.alreadyRunning:
      return alreadyRunning(nonEmpty(attributes.extractionId));
    case START_EXTRACTION_ERROR_CODES.repositoryNotConfigured:
      return repositoryNotConfigured(nonEmpty(attributes.repository));
    case START_EXTRACTION_ERROR_CODES.noRepositories:
      return noRepositories();
    case START_EXTRACTION_ERROR_CODES.sandboxUnavailable:
      return sandboxUnavailable(nonEmpty(message));
    case START_EXTRACTION_ERROR_CODES.capacityExhausted:
      return capacityExhausted();
    default:
      return unknownError(nonEmpty(message));
  }
};
