/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDestinationIndexAliases } from './transform_utils';

describe('test transform_utils', () => {
  describe('getDestinationIndexAliases()', function () {
    test('return transform alias settings when input is an object', () => {
      const aliasSettings = {
        '.alerts-security.host-risk-score-latest.latest': { move_on_creation: true },
        '.alerts-security.host-risk-score-latest.all': { move_on_creation: false },
      };
      expect(getDestinationIndexAliases(aliasSettings)).toStrictEqual([
        { alias: '.alerts-security.host-risk-score-latest.latest', move_on_creation: true },
        { alias: '.alerts-security.host-risk-score-latest.all', move_on_creation: false },
      ]);
    });

    test('return transform alias settings when input is an array', () => {
      const aliasSettings = [
        '.alerts-security.host-risk-score-latest.latest',
        '.alerts-security.host-risk-score-latest.all',
      ];
      expect(getDestinationIndexAliases(aliasSettings)).toStrictEqual([
        { alias: '.alerts-security.host-risk-score-latest.latest', move_on_creation: true },
        { alias: '.alerts-security.host-risk-score-latest.all', move_on_creation: false },
      ]);
    });

    test('return transform alias settings when input is a string', () => {
      expect(
        getDestinationIndexAliases('.alerts-security.host-risk-score-latest.latest')
      ).toStrictEqual([
        { alias: '.alerts-security.host-risk-score-latest.latest', move_on_creation: true },
      ]);

      expect(
        getDestinationIndexAliases('.alerts-security.host-risk-score-latest.all')
      ).toStrictEqual([
        { alias: '.alerts-security.host-risk-score-latest.all', move_on_creation: false },
      ]);
    });

    test('return empty array when input is invalid', () => {
      expect(getDestinationIndexAliases(undefined)).toStrictEqual([]);

      expect(getDestinationIndexAliases({})).toStrictEqual([]);
    });
  });
});
