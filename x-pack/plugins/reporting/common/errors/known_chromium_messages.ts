/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export enum KnownChromiumMessages {
  /**
   * The browser couldn't start properly due to missing system dependencies.
   */
  SharedLibraries = 'error while loading shared libraries',
  /**
   * The browser couldn't start due to missing fonts
   */
  MissingFont = 'Could not find the default font',
  /**
   * The browser could not create or find a sandbox environment, likely due
   * to OS configurations.
   */
  NoSandbox = 'No usable sandbox',
}
