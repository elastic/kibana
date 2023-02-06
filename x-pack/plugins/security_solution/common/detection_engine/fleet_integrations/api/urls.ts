/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { INTERNAL_DETECTION_ENGINE_URL as INTERNAL_URL } from '../../../constants';

export const GET_INSTALLED_INTEGRATIONS_URL =
  `${INTERNAL_URL}/fleet/integrations/installed` as const;
