/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ResourceIdentifiers } from '../types';
import { splResourceIdentifier } from './splunk_identifier';

export const splResourceIdentifiers: ResourceIdentifiers = {
  fromOriginalRule: (originalRule) => splResourceIdentifier(originalRule.query),
  fromResource: (resource) => {
    if (resource.type === 'macro' && resource.content) {
      return splResourceIdentifier(resource.content);
    }
    return [];
  },
};
