/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { TestUtils } from 'src/plugins/es_ui_shared/public';
import {
  setup as mappingsEditorSetup,
  MappingsEditorTestBed,
  DomFields,
  getMappingsEditorDataFactory,
} from './mappings_editor.helpers';

const { nextTick, getRandomString, findTestSubject } = TestUtils;

type TestBed<T> = TestUtils.TestBed<T>;

export { nextTick, getRandomString, findTestSubject, TestBed };

export const componentHelpers = {
  mappingsEditor: { setup: mappingsEditorSetup, getMappingsEditorDataFactory },
};

export { MappingsEditorTestBed, DomFields };
