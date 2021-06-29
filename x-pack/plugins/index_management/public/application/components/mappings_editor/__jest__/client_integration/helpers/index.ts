/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  setup as mappingsEditorSetup,
  MappingsEditorTestBed,
  DomFields,
  getMappingsEditorDataFactory,
} from './mappings_editor.helpers';

export { nextTick, getRandomString, findTestSubject, TestBed } from '@kbn/test/jest';

export const componentHelpers = {
  mappingsEditor: { setup: mappingsEditorSetup, getMappingsEditorDataFactory },
};

export { MappingsEditorTestBed, DomFields };
