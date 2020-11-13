/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const useRolloverPath = '_meta.hot.useRollover';

/**
 * These strings describe the path to their respective values in the serialized
 * ILM form.
 */
export const ROLLOVER_FORM_PATHS = {
  maxDocs: 'phases.hot.actions.rollover.max_docs',
  maxAge: 'phases.hot.actions.rollover.max_age',
  maxSize: 'phases.hot.actions.rollover.max_size',
};
