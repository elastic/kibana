/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export function useKibana() {
  return {
    services: {
      uiSettings: {
        get: (setting: string) => {
          if (setting === 'dateFormat') {
            return 'MMM D, YYYY HH:mm';
          }
        },
      },
      http: {
        basePath: {
          prepend: () => '',
        },
      },
      notifications: {
        toasts: {
          addSuccess: () => {},
          addError: () => {},
        },
      },
    },
  };
}
