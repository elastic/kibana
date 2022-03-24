/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getFileNameWithoutExt } from './side_car_file_picker';

test('getFileNameWithoutExt', () => {
  expect(getFileNameWithoutExt('foo')).toBe('foo');
  expect(getFileNameWithoutExt('foo.shp')).toBe('foo');
  expect(getFileNameWithoutExt('foo.bar.shp')).toBe('foo.bar');
});
