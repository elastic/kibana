/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const capabilitiesProvider = () => ({
  spaces: {
    manage: true,
  },
  catalogue: {
    spaces: true,
  },
  management: {
    kibana: {
      spaces: true,
    },
  },
});
