/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock, notificationServiceMock, overlayServiceMock } from '@kbn/core/public/mocks';

export const kibanaStartMock = {
  startContract() {
    return {
      notifications: notificationServiceMock.createStartContract(),
      overlays: overlayServiceMock.createStartContract(),
      services: {
        ...coreMock.createStart(),
        storage: coreMock.createStorage(),
      },
    };
  },
};
