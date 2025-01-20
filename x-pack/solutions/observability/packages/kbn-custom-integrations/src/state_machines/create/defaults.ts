/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const DEFAULT_CONTEXT = {
  options: {
    deletePrevious: false,
    resetOnCreation: true,
    errorOnFailedCleanup: false,
  },
  fields: {
    integrationName: '',
    datasets: [
      {
        type: 'logs' as const, // NOTE: Hardcoded to logs until we support multiple types via the UI.
        name: '',
      },
    ],
  },
  touchedFields: {
    integrationName: false,
    datasets: false,
  },
  errors: null,
};
