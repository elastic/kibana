/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore
import consoleStamp from 'console-stamp';

export function stampLogger() {
  consoleStamp(console, '[HH:MM:ss.l]');
}
