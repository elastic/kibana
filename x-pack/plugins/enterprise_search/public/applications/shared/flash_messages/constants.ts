/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const FLASH_MESSAGE_TYPES = {
  success: { color: 'success', iconType: 'check' },
  info: { color: 'primary', iconType: 'iInCircle' },
  warning: { color: 'warning', iconType: 'alert' },
  error: { color: 'danger', iconType: 'alert' },
};

// This is the default amount of time (5 seconds) a toast will last before disappearing
// It can be overridden per-toast by passing the `toastLifetimeMs` property - @see types.ts
export const DEFAULT_TOAST_TIMEOUT = 5000;
