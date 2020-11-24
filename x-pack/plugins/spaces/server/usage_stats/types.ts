/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface UsageStats {
  apiCalls?: {
    copySavedObjects?: {
      total: number;
      createNewCopiesEnabled: {
        yes: number;
        no: number;
      };
      overwriteEnabled: {
        yes: number;
        no: number;
      };
    };
    resolveCopySavedObjectsErrors?: {
      total: number;
      createNewCopiesEnabled: {
        yes: number;
        no: number;
      };
    };
  };
}
