/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SLO_RESOURCES_VERSION } from '../../../common/constants';

export const getSLOSummarySettingsTemplate = (name: string) => ({
  name,
  template: {
    settings: {
      auto_expand_replicas: '0-1',
      hidden: true,
    },
  },
  _meta: {
    description: 'SLO summary settings template',
    version: SLO_RESOURCES_VERSION,
    managed: true,
    managed_by: 'observability',
  },
});
