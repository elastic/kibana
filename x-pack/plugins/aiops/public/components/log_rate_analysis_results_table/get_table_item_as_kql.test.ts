/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { finalSignificantTermGroups } from '../../../common/__mocks__/artificial_logs/final_significant_term_groups';
import { significantTerms } from '../../../common/__mocks__/artificial_logs/significant_terms';

import { getGroupTableItems } from './get_group_table_items';
import { getTableItemAsKQL } from './get_table_item_as_kql';

describe('getTableItemAsKQL', () => {
  it('returns a KQL syntax for a significant term', () => {
    expect(getTableItemAsKQL(significantTerms[0])).toBe('user:Peter');
    expect(getTableItemAsKQL(significantTerms[1])).toBe('response_code:500');
    expect(getTableItemAsKQL(significantTerms[2])).toBe('url:home.php');
    expect(getTableItemAsKQL(significantTerms[3])).toBe('url:login.php');
  });
  it('returns a KQL syntax for a group of significant terms', () => {
    const groupTableItems = getGroupTableItems(finalSignificantTermGroups);
    expect(getTableItemAsKQL(groupTableItems[0])).toBe('user:Peter AND url:login.php');
    expect(getTableItemAsKQL(groupTableItems[1])).toBe('response_code:500 AND url:home.php');
    expect(getTableItemAsKQL(groupTableItems[2])).toBe('url:login.php AND response_code:500');
    expect(getTableItemAsKQL(groupTableItems[3])).toBe('user:Peter AND url:home.php');
  });
});
