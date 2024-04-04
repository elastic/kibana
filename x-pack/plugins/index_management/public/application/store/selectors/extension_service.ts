/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExtensionsService } from '../../../services/extensions_service';

// Temporary hack to provide the extensionsService instance to this file.
// TODO: Refactor and export all the app selectors through the app dependencies context

let extensionsService;
export const setExtensionsService = (_extensionsService: ExtensionsService) => {
  extensionsService = _extensionsService;
};

export { extensionsService };

// End hack
