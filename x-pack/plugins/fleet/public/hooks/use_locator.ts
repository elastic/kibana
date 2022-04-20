/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SerializableRecord } from '@kbn/utility-types';

import { useStartServices } from './use_core';

export function useLocator<T extends SerializableRecord>(locatorId: string) {
  const services = useStartServices();
  const apmLocator = services.share.url.locators.get<T>(locatorId);
  return apmLocator;
}
