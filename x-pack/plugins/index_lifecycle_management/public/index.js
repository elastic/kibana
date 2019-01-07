/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import './register_management_section';
import './register_routes';

import chrome from 'ui/chrome';
import { addAllExtensions } from './extend_index_management';

// Only add extensions if ILM UI is enabled
if (chrome.getInjected('ilmUiEnabled')) {
  addAllExtensions();
}
