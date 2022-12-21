/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToastInputFields } from '@kbn/core/public';

export interface CanvasNotifyService {
  error: (err: string | Error, opts?: ToastInputFields) => void;
  warning: (err: string | Error, opts?: ToastInputFields) => void;
  info: (err: string | Error, opts?: ToastInputFields) => void;
  success: (err: string | Error, opts?: ToastInputFields) => void;
}
