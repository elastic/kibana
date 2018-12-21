/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isValidDataUrl } from '../../common/lib/dataurl';
import { isValidHttpUrl } from '../../common/lib/httpurl';

export function isValidUrl(url) {
  return isValidDataUrl(url) || isValidHttpUrl(url);
}
