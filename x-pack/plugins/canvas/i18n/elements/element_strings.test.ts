/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { getElementStrings } from './element_strings';
import { initializeElements } from '../../canvas_plugin_src/elements';
import { coreMock } from '../../../../../src/core/public/mocks';

const elementSpecs = initializeElements(coreMock.createSetup() as any, {} as any);

describe('ElementStrings', () => {
  const elementStrings = getElementStrings();
  const elementNames = elementSpecs.map((spec) => spec().name);
  const stringKeys = Object.keys(elementStrings);

  test('All element names should exist in the strings definition', () => {
    elementNames.forEach((name) => expect(stringKeys).toContain(name));
  });

  test('All string definitions should correspond to an existing element', () => {
    stringKeys.forEach((key) => expect(elementNames).toContain(key));
  });

  const strings = Object.values(elementStrings);

  test('All elements should have a displayName string defined', () => {
    strings.forEach((value) => {
      expect(value).toHaveProperty('displayName');
    });
  });

  test('All elements should have a help string defined', () => {
    strings.forEach((value) => {
      expect(value).toHaveProperty('help');
    });
  });
});
