/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  HOST_OS_VERSION,
  DEVICE_MODEL_NAME,
  NETWORK_CONNECTION_TYPE,
  SERVICE_VERSION,
} from '../es_fields/apm';
import { fieldValuePairToKql } from './field_value_pair_to_kql';

export function getKueryWithMobileFilters({
  device,
  osVersion,
  appVersion,
  netConnectionType,
  kuery,
}: {
  device: string | undefined;
  osVersion: string | undefined;
  appVersion: string | undefined;
  netConnectionType: string | undefined;
  kuery: string;
}) {
  const kueryWithFilters = [
    kuery,
    ...fieldValuePairToKql(DEVICE_MODEL_NAME, device),
    ...fieldValuePairToKql(HOST_OS_VERSION, osVersion),
    ...fieldValuePairToKql(SERVICE_VERSION, appVersion),
    ...fieldValuePairToKql(NETWORK_CONNECTION_TYPE, netConnectionType),
  ]
    .filter(Boolean)
    .join(' and ');

  return kueryWithFilters;
}
