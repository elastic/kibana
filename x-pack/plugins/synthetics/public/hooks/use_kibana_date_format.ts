/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kibanaService } from '../utils/kibana_service';

const DEFAULT_FORMAT = 'MMM D, YYYY @ HH:mm:ss.SSS';

export function useKibanaDateFormat() {
  return kibanaService.core.uiSettings.get('dateFormat', DEFAULT_FORMAT);
}
