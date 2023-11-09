/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Capture and return the calling stack for the context that called this utility.
 */
export const captureCallingStack = () => {
  const s = { stack: '' };
  Error.captureStackTrace(s);
  return `Called from:\n${s.stack.split('\n').slice(3).join('\n')}`;
};
