/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { http } from '../http_service';

export const fileDatavisualizer = {
  analyzeFile(file: string, params: Record<string, string> = {}) {
    const body = JSON.stringify(file);
    return http<any>({
      path: '/api/file_upload/analyze_file',
      method: 'POST',
      body,
      query: params,
    });
  },
};
