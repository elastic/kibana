/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const getSLOSummarySettingsTemplate = (name: string) => ({
  name,
  template: {
    settings: {
      hidden: true,
    },
  },
  _meta: {
    description: 'Settings for SLO summary',
    version: 1,
    managed: true,
    managed_by: 'observability',
  },
});
