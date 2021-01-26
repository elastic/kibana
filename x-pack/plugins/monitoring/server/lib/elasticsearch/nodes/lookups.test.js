/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { nodeTypeClass, nodeTypeLabel } from './lookups';
import _ from 'lodash';

// TODO: tests were not running and are not up to date
describe.skip('Node Types Lookups', () => {
  it('Has matching classes and labels', () => {
    const classKeys = Object.keys(nodeTypeClass);
    const labelKeys = Object.keys(nodeTypeLabel);
    const typeKeys = ['client', 'data', 'invalid', 'master', 'master_only', 'node'];
    classKeys.sort();
    labelKeys.sort();
    expect(classKeys).toBe(typeKeys);
    expect(labelKeys).toBe(typeKeys);
  });

  it('Has usable values', () => {
    _.each(nodeTypeClass, (value) => {
      expect(value).toBeInstanceOf(String);
    });
    _.each(nodeTypeLabel, (value) => {
      expect(value).toBeInstanceOf(String);
    });
  });
});
