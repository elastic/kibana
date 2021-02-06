/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SpacesApiUi,
  SpacesApiUiComponent,
} from '../../../../../src/plugins/spaces_oss/public';

function createComponentsMock(): jest.Mocked<SpacesApiUiComponent> {
  return {
    SpacesContext: jest.fn(),
    ShareToSpaceFlyout: jest.fn(),
  };
}

function createUiApiMock(): jest.Mocked<SpacesApiUi> {
  return {
    components: createComponentsMock(),
  };
}

export const uiApiMock = {
  create: createUiApiMock,
};
