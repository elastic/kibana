/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import { START_EXTRACTION_ERROR_CODES } from '../common/start_extraction_errors';
import { extractionLockId } from '../common/extraction_lock_id';

export interface StartErrorDescription {
  readonly repository: string;
  readonly title: string;
  readonly explanation: string;
  readonly suggestions: readonly string[];
  /** The extraction that is already running, when the server could name it. */
  readonly extractionId?: string;
}

interface ErrorBody {
  readonly message?: unknown;
  readonly attributes?: { readonly code?: unknown; readonly extractionId?: unknown };
}

/** Reads the parsed body of a Kibana `IHttpFetchError` without trusting its shape. */
const errorBody = (error: unknown): ErrorBody => {
  if (typeof error !== 'object' || error === null || !('body' in error)) return {};
  const { body } = error as { body?: unknown };
  return typeof body === 'object' && body !== null ? (body as ErrorBody) : {};
};

const alreadyRunning = (repository: string, extractionId?: string): StartErrorDescription => ({
  repository,
  ...(extractionId === undefined ? {} : { extractionId }),
  title: i18n.translate('xpack.codeIntelligence.repositories.startError.alreadyRunning.title', {
    defaultMessage: 'An extraction for {repository} is already running',
    values: { repository },
  }),
  explanation: i18n.translate(
    'xpack.codeIntelligence.repositories.startError.alreadyRunning.explanation',
    {
      defaultMessage:
        'Only one extraction per repository can run at a time, because a finished run removes catalog documents it did not write. The running extraction may have been started in another tab, by another user, or on another Kibana instance, so it may not appear in this table.',
    }
  ),
  suggestions: [
    i18n.translate('xpack.codeIntelligence.repositories.startError.alreadyRunning.wait', {
      defaultMessage: 'Wait for the running extraction to finish, then run it again.',
    }),
    i18n.translate('xpack.codeIntelligence.repositories.startError.alreadyRunning.otherTab', {
      defaultMessage: 'If you started it in another tab, follow its progress there.',
    }),
    i18n.translate('xpack.codeIntelligence.repositories.startError.alreadyRunning.crashed', {
      defaultMessage:
        'If Kibana restarted or stopped during the run, the lock releases on its own within about 30 seconds. Try again after that.',
    }),
    i18n.translate('xpack.codeIntelligence.repositories.startError.alreadyRunning.staleLock', {
      defaultMessage:
        'If this keeps happening while no extraction is running anywhere, ask an administrator to look for the lock named {lockId} in the Kibana locks index.',
      values: { lockId: extractionLockId(repository) },
    }),
  ],
});

const repositoryNotConfigured = (repository: string): StartErrorDescription => ({
  repository,
  title: i18n.translate(
    'xpack.codeIntelligence.repositories.startError.repositoryNotConfigured.title',
    {
      defaultMessage: '{repository} is no longer configured',
      values: { repository },
    }
  ),
  explanation: i18n.translate(
    'xpack.codeIntelligence.repositories.startError.repositoryNotConfigured.explanation',
    {
      defaultMessage:
        'Kibana does not list this repository in its configuration. It was probably removed after this page loaded.',
    }
  ),
  suggestions: [
    i18n.translate(
      'xpack.codeIntelligence.repositories.startError.repositoryNotConfigured.reload',
      {
        defaultMessage: 'Reload the page to see the current list of repositories.',
      }
    ),
    i18n.translate(
      'xpack.codeIntelligence.repositories.startError.repositoryNotConfigured.checkConfig',
      {
        defaultMessage:
          'If the repository should be available, add it to {setting} in kibana.yml and restart Kibana.',
        values: { setting: 'xpack.code_intelligence.repositories' },
      }
    ),
  ],
});

const capacityExhausted = (repository: string): StartErrorDescription => ({
  repository,
  title: i18n.translate('xpack.codeIntelligence.repositories.startError.capacityExhausted.title', {
    defaultMessage: 'The extraction for {repository} could not be started because Kibana is busy',
    values: { repository },
  }),
  explanation: i18n.translate(
    'xpack.codeIntelligence.repositories.startError.capacityExhausted.explanation',
    {
      defaultMessage:
        'This Kibana instance keeps track of at most 100 extractions, and all of them are still running.',
    }
  ),
  suggestions: [
    i18n.translate('xpack.codeIntelligence.repositories.startError.capacityExhausted.wait', {
      defaultMessage: 'Wait for some running extractions to finish, then try again.',
    }),
    i18n.translate('xpack.codeIntelligence.repositories.startError.capacityExhausted.restart', {
      defaultMessage:
        'Restarting Kibana clears the tracked extractions, but it also stops the ones that are running.',
    }),
  ],
});

const unknownError = (repository: string, message?: string): StartErrorDescription => ({
  repository,
  title: i18n.translate('xpack.codeIntelligence.repositories.startError.unknown.title', {
    defaultMessage: 'The extraction for {repository} could not be started',
    values: { repository },
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

/** Turns a failed start request into what went wrong, why, and what the user can do next. */
export const describeStartError = (error: unknown, repository: string): StartErrorDescription => {
  const { message, attributes } = errorBody(error);
  switch (attributes?.code) {
    case START_EXTRACTION_ERROR_CODES.alreadyRunning:
      return alreadyRunning(
        repository,
        typeof attributes.extractionId === 'string' && attributes.extractionId.length > 0
          ? attributes.extractionId
          : undefined
      );
    case START_EXTRACTION_ERROR_CODES.repositoryNotConfigured:
      return repositoryNotConfigured(repository);
    case START_EXTRACTION_ERROR_CODES.capacityExhausted:
      return capacityExhausted(repository);
    default:
      return unknownError(
        repository,
        typeof message === 'string' && message.trim().length > 0 ? message : undefined
      );
  }
};
