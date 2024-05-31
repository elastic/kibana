/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { validateVersion } from '.';

describe('validateVersion', () => {
  describe('invalid versions', () => {
    ['foo', '123', '1.x.2', 'last', '#', '', '1.2', null].map((invalidInput) =>
      it(`${invalidInput}: is an invalid version`, () => {
        expect(validateVersion(invalidInput)).toBeFalsy();
      })
    );
  });
  describe('valid versions', () => {
    ['1.234.5', '1.2.3', '0.0.0', 'latest'].map((validVersion) =>
      it(`${validVersion}: is a valid version`, () => {
        expect(validateVersion(validVersion)).toBeTruthy();
      })
    );
  });
});
