/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CARRIER_LOCATION,
  CARRIER_NAME,
  CONNECTION_TYPE,
  DEVICE_MODEL,
  HOST_OS,
  OS_PLATFORM,
  SERVICE_VERSION,
  URL_LABEL,
} from '../constants/labels';

export const MobileFields: Record<string, string> = {
  'host.os.platform': OS_PLATFORM,
  'host.os.full': HOST_OS,
  'service.version': SERVICE_VERSION,
  'network.carrier.icc': CARRIER_LOCATION,
  'network.carrier.name': CARRIER_NAME,
  'network.connection_type': CONNECTION_TYPE,
  'labels.device_model': DEVICE_MODEL,
  'url.full': URL_LABEL,
};
