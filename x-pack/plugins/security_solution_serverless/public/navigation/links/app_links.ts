/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Services } from '../../common/services';
import { mlAppLink } from './sections/ml_links';

export const setAppLinks = (services: Services) => {
  services.securitySolution.setExtraAppLinks([
    mlAppLink, // ML landing page app link
  ]);
};
