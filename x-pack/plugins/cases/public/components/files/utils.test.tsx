/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isImage, parseMimeType } from './utils';

import { imageMimeTypes, textMimeTypes } from '../../../common/constants/mime_types';

describe('isImage', () => {
  it('should return true for allowed image mime types', () => {
    // @ts-ignore
    expect(imageMimeTypes.reduce((acc, curr) => acc && isImage({ mimeType: curr }))).toBeTruthy();
  });

  it('should return false for allowed non-image mime types', () => {
    // @ts-ignore
    expect(textMimeTypes.reduce((acc, curr) => acc && isImage({ mimeType: curr }))).toBeFalsy();
  });
});

describe('parseMimeType', () => {
  it('should return Unknown for empty strings', () => {
    expect(parseMimeType('')).toBe('Unknown');
  });

  it('should return Unknown for undefined', () => {
    expect(parseMimeType(undefined)).toBe('Unknown');
  });

  it('should return Unknown for strings starting with forward slash', () => {
    expect(parseMimeType('/start')).toBe('Unknown');
  });

  it('should return Unknown for strings with no forward slash', () => {
    expect(parseMimeType('no-slash')).toBe('Unknown');
  });

  it('should return capitalize first letter for valid strings', () => {
    expect(parseMimeType('foo/bar')).toBe('Foo');
  });
});
