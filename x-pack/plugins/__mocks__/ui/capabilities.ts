/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UICapabilities } from 'ui/capabilities';

let internals: UICapabilities = {
  navLinks: {},
  spaces: {
    manage: true,
  },
};

export const uiCapabilities = new Proxy(
  {},
  {
    get: (target, property) => {
      return internals[String(property)] as any;
    },
  }
);

export function setMockCapabilities(mockCapabilities: UICapabilities) {
  internals = mockCapabilities;
}
