/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable max-classes-per-file */

export class NotFoundError extends Error {
  constructor(message?: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class AnomalyThresholdRangeError extends Error {
  constructor(message?: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class SavedObjectReferenceResolutionError extends Error {
  constructor(message?: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = 'SavedObjectReferenceResolutionError';
  }
}

export class NoSuchRemoteClusterError extends Error {
  constructor(message?: string) {
    super(message || 'The configured remote cluster is missing or not reachable.');
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = 'NoSuchRemoteClusterError';
  }
}

export const isNoSuchRemoteClusterMessage = (message: string) => {
  return message.includes('no_such_remote_cluster_exception');
};
