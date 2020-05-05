/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const AccessForbidden = Symbol('AccessForbidden');
export const IndexNotFound = Symbol('IndexNotFound');
export const CannotCreateIndex = Symbol('CannotCreateIndex');

export const ReindexTaskFailed = Symbol('ReindexTaskFailed');
export const ReindexTaskCannotBeDeleted = Symbol('ReindexTaskCannotBeDeleted');
export const ReindexAlreadyInProgress = Symbol('ReindexAlreadyInProgress');
export const ReindexIsNotInQueue = Symbol('ReindexIsNotInQueue');
export const ReindexCannotBeCancelled = Symbol('ReindexCannotBeCancelled');

export const MultipleReindexJobsFound = Symbol('MultipleReindexJobsFound');
