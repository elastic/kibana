/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { addTags } from './add_tags';
import { INTERNAL_RULE_ID_KEY, INTERNAL_IMMUTABLE_KEY } from '../../../../common/constants';

describe('add_tags', () => {
  test('it should add a rule id as an internal structure with immutable true', () => {
    const tags = addTags([], 'rule-1', true);
    expect(tags).toEqual([`${INTERNAL_RULE_ID_KEY}:rule-1`, `${INTERNAL_IMMUTABLE_KEY}:true`]);
  });

  test('it should add a rule id as an internal structure with immutable false', () => {
    const tags = addTags([], 'rule-1', false);
    expect(tags).toEqual([`${INTERNAL_RULE_ID_KEY}:rule-1`, `${INTERNAL_IMMUTABLE_KEY}:false`]);
  });

  test('it should not allow duplicate tags to be created', () => {
    const tags = addTags(['tag-1', 'tag-1'], 'rule-1', false);
    expect(tags).toEqual([
      'tag-1',
      `${INTERNAL_RULE_ID_KEY}:rule-1`,
      `${INTERNAL_IMMUTABLE_KEY}:false`,
    ]);
  });

  test('it should not allow duplicate internal tags to be created when called two times in a row', () => {
    const tags1 = addTags(['tag-1'], 'rule-1', false);
    const tags2 = addTags(tags1, 'rule-1', false);
    expect(tags2).toEqual([
      'tag-1',
      `${INTERNAL_RULE_ID_KEY}:rule-1`,
      `${INTERNAL_IMMUTABLE_KEY}:false`,
    ]);
  });
});
