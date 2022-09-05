/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ReactNode, ReactChild } from 'react';

export type FlashMessageTypes = 'success' | 'info' | 'warning' | 'error';
export type FlashMessageColors = 'success' | 'primary' | 'warning' | 'danger';

export interface IFlashMessage {
  description?: ReactNode;
  iconType?: string;
  message: ReactNode;
  type: FlashMessageTypes;
}

// @see EuiGlobalToastListToast for more props
export interface ToastOptions {
  iconType?: string;
  id?: string;
  text?: ReactChild; // Additional text below the message/title, same as IFlashMessage['description']
  toastLifeTimeMs?: number; // Allows customing per-toast timeout
}
