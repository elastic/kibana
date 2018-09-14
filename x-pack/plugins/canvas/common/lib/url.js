/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isValid as isValidDataUrl } from '../../common/lib/dataurl';
import { isValid as isValidHttpUrl } from '../../common/lib/httpurl';

export function isValid(url) {
  return isValidDataUrl(url) || isValidHttpUrl(url);
}
