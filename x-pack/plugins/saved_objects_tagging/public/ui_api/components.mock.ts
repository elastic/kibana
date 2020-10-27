/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsTaggingApiUiComponent } from '../../../../../src/plugins/saved_objects_tagging_oss/public';

const createComponentsMock = (): jest.Mocked<SavedObjectsTaggingApiUiComponent> => {
  return {
    TagList: jest.fn(),
    TagSelector: jest.fn(),
    SavedObjectSaveModalTagSelector: jest.fn(),
  };
};

export const componentsMock = {
  create: createComponentsMock,
};
