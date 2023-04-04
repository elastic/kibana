/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { finalSignificantTermGroups } from '../../../common/__mocks__/artificial_logs/final_significant_term_groups';
import { significantTerms } from '../../../common/__mocks__/artificial_logs/significant_terms';

import { getGroupTableItems } from './get_group_table_items';
import { isSignificantTerm, getTableItemAsKuery } from './get_table_item_as_kuery';

describe('isSignificantTerm', () => {
  it('identifies significant terms', () => {
    expect(isSignificantTerm({})).toBeFalsy();
    expect(isSignificantTerm({ fieldName: 'response_code' })).toBeFalsy();
    expect(isSignificantTerm({ fieldValue: '500' })).toBeFalsy();
    expect(isSignificantTerm(significantTerms[0])).toBeTruthy();
  });
});

describe('getTableItemAsKuery', () => {
  it('returns a KUERY for a significant term', () => {
    expect(getTableItemAsKuery(significantTerms[0])).toBe('response_code:500');
    expect(getTableItemAsKuery(significantTerms[1])).toBe('url:home.php');
    expect(getTableItemAsKuery(significantTerms[2])).toBe('url:login.php');
    expect(getTableItemAsKuery(significantTerms[3])).toBe('user:Peter');
  });
  it('returns a KUERY for a group of significant terms', () => {
    const groupTableItems = getGroupTableItems(finalSignificantTermGroups);
    expect(getTableItemAsKuery(groupTableItems[0])).toBe('user:Peter AND url:login.php');
    expect(getTableItemAsKuery(groupTableItems[1])).toBe('response_code:500 AND url:home.php');
    expect(getTableItemAsKuery(groupTableItems[2])).toBe('url:login.php AND response_code:500');
    expect(getTableItemAsKuery(groupTableItems[3])).toBe('user:Peter AND url:home.php');
  });
});
