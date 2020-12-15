/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { colourPalette } from './data_formatting';

describe('Palettes', () => {
  it('A colour palette comprising timing and mime type colours is correctly generated', () => {
    expect(colourPalette).toEqual({
      blocked: '#b9a888',
      connect: '#da8b45',
      dns: '#54b399',
      font: '#aa6556',
      html: '#f3b3a6',
      media: '#d6bf57',
      other: '#e7664c',
      receive: '#54b399',
      script: '#9170b8',
      send: '#d36086',
      ssl: '#edc5a2',
      stylesheet: '#ca8eae',
      wait: '#b0c9e0',
    });
  });
});
