/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable max-classes-per-file */

import { isErrorWithMeta } from './utils';

export class ArtifactsClientError extends Error {}

export class ArtifactsClientAccessDeniedError extends Error {
  constructor(deniedPackageName: string, allowedPackageName: string) {
    super(
      `Access denied. Artifact package name (${deniedPackageName}) does not match ${allowedPackageName}`
    );
  }
}

export class ArtifactsElasticsearchError extends Error {
  readonly requestDetails: string;

  constructor(public readonly meta: Error) {
    super(
      `${
        isErrorWithMeta(meta) && meta.meta.body?.error?.reason
          ? meta.meta.body?.error?.reason
          : `Elasticsearch error while working with artifacts: ${meta.message}`
      }`
    );

    if (isErrorWithMeta(meta)) {
      const { method, path, querystring = '', body = '' } = meta.meta.meta.request.params;
      this.requestDetails = `${method} ${path}${querystring ? `?${querystring}` : ''}${
        body ? `\n${body}` : ''
      }`;
    } else {
      this.requestDetails = 'unable to determine request details';
    }
  }
}
