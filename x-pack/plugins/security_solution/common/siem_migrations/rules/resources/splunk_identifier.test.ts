/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { splResourceIdentifier } from './splunk_identifier';

describe('splResourceIdentifier', () => {
  it('should extract macros correctly', () => {
    const query =
      '`macro_zero`, `macro_one(arg1)`, some search command `macro_two(arg1, arg2)` another command `macro_three(arg1, arg2, arg3)`';

    const result = splResourceIdentifier(query);

    expect(result.macro).toEqual(['macro_zero', 'macro_one(1)', 'macro_two(2)', 'macro_three(3)']);
    expect(result.list).toEqual([]);
  });

  it('should extract lookup tables correctly', () => {
    const query =
      'search ... | lookup my_lookup_table field AS alias OUTPUT new_field | inputlookup other_lookup_list | lookup third_lookup';

    const result = splResourceIdentifier(query);

    expect(result.macro).toEqual([]);
    expect(result.list).toEqual(['my_lookup_table', 'other_lookup_list', 'third_lookup']);
  });

  it('should extract both macros and lookup tables correctly', () => {
    const query =
      '`macro_one` some search command | lookup my_lookup_table field AS alias OUTPUT new_field | inputlookup other_lookup_list | lookup third_lookup';

    const result = splResourceIdentifier(query);

    expect(result.macro).toEqual(['macro_one']);
    expect(result.list).toEqual(['my_lookup_table', 'other_lookup_list', 'third_lookup']);
  });

  it('should return empty arrays if no macros or lookup tables are found', () => {
    const query = 'search | stats count';

    const result = splResourceIdentifier(query);

    expect(result.macro).toEqual([]);
    expect(result.list).toEqual([]);
  });

  it('should handle queries with both macros and lookup tables mixed with other commands', () => {
    const query =
      'search `macro_one` | `my_lookup_table` field AS alias myfakelookup new_field | inputlookup real_lookup_list | `third_macro`';

    const result = splResourceIdentifier(query);

    expect(result.macro).toEqual(['macro_one', 'my_lookup_table', 'third_macro']);
    expect(result.list).toEqual(['real_lookup_list']);
  });

  it('should ignore macros or lookup tables inside string literals with double quotes', () => {
    const query =
      '`macro_one` | lookup my_lookup_table | search title="`macro_two` and lookup another_table"';

    const result = splResourceIdentifier(query);

    expect(result.macro).toEqual(['macro_one']);
    expect(result.list).toEqual(['my_lookup_table']);
  });

  it('should ignore macros or lookup tables inside string literals with single quotes', () => {
    const query =
      "`macro_one` | lookup my_lookup_table | search title='`macro_two` and lookup another_table'";

    const result = splResourceIdentifier(query);

    expect(result.macro).toEqual(['macro_one']);
    expect(result.list).toEqual(['my_lookup_table']);
  });

  it('should ignore macros or lookup tables inside comments wrapped by ```', () => {
    const query =
      '`macro_one` | ```this is a comment with `macro_two` and lookup another_table``` lookup my_lookup_table';

    const result = splResourceIdentifier(query);

    expect(result.macro).toEqual(['macro_one']);
    expect(result.list).toEqual(['my_lookup_table']);
  });
});
