/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PRECONFIGURED_ENDPOINTS } from '../components/all_inference_endpoints/constants';

export const isEndpointPreconfigured = (endpoint: string) =>
  Object.values(PRECONFIGURED_ENDPOINTS).includes(endpoint);
