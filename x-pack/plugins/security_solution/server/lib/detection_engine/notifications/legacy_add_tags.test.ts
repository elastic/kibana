/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// eslint-disable-next-line no-restricted-imports
import { legacyAddTags } from './legacy_add_tags';
import { INTERNAL_RULE_ALERT_ID_KEY } from '../../../../common/constants';

describe('legacyAdd_tags', () => {
  test('it should add a rule id as an internal structure', () => {
    const tags = legacyAddTags([], 'rule-1');
    expect(tags).toEqual([`${INTERNAL_RULE_ALERT_ID_KEY}:rule-1`]);
  });

  test('it should not allow duplicate tags to be created', () => {
    const tags = legacyAddTags(['tag-1', 'tag-1'], 'rule-1');
    expect(tags).toEqual(['tag-1', `${INTERNAL_RULE_ALERT_ID_KEY}:rule-1`]);
  });

  test('it should not allow duplicate internal tags to be created when called two times in a row', () => {
    const tags1 = legacyAddTags(['tag-1'], 'rule-1');
    const tags2 = legacyAddTags(tags1, 'rule-1');
    expect(tags2).toEqual(['tag-1', `${INTERNAL_RULE_ALERT_ID_KEY}:rule-1`]);
  });
});
