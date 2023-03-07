/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable max-classes-per-file */

import { HttpFetchError } from '@kbn/core-http-browser-internal/src/http_fetch_error';
import { i18n } from '@kbn/i18n';

const NO_SUCH_REMOTE_CLUSTER = 'no_such_remote_cluster_exception';

const defaultTitle = i18n.translate('xpack.infra.sourceConfiguration.failedToFetchSource', {
  defaultMessage: 'Failed source request.',
});

const noSuchRemoteClusterMessage = i18n.translate(
  'xpack.infra.sourceConfiguration.noSuchRemoteCluster',
  {
    defaultMessage:
      'The remote cluster is not configured or not available.\nCheck the metric index settings and make sure they are written correctly.',
  }
);

const missingHttpMessage = i18n.translate('xpack.infra.sourceConfiguration.missingHttp', {
  defaultMessage: 'Failed to load source: No http client available.',
});

/**
 * Errors
 */
class NoSuchRemoteClusterException extends Error {
  constructor(message: string = noSuchRemoteClusterMessage) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = 'NoSuchRemoteClusterException';
  }
}

export class MissingHttpClientException extends Error {
  constructor() {
    super(missingHttpMessage);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = 'MissingHttpClientException';
  }
}

/**
 * Utils
 */
export const throwLoadSourceError = (error: HttpFetchError) => {
  const { message } = error.body;

  if (isNoSuchRemoteClusterMessage(message)) {
    throw new NoSuchRemoteClusterException();
  }
};

const isNoSuchRemoteClusterMessage = (message: string) => {
  return message.includes(NO_SUCH_REMOTE_CLUSTER);
};

export const getSourceErrorToast = (body: string) => {
  return {
    toastLifeTimeMs: 3000,
    title: defaultTitle,
    body,
  };
};
