/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SecurityPageName } from '../../../app/types';

export const LINKS_TELEMETRY_EVENTS = {
  ENTITY_DETAILS_CLICKED_EVENT: (page: SecurityPageName, entity: 'host' | 'user') =>
    `${entity}_details_clicked_${page}`,
};
