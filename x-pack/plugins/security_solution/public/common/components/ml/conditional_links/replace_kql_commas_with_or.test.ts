/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { replaceKqlCommasWithOr } from './replace_kql_commas_with_or';

describe('replace_kql_commas_with_or', () => {
  test('replaces two comma separated values using an or clause', () => {
    const replacement = replaceKqlCommasWithOr(
      '(query:\'user.name : "becky,evan"\',language:kuery)'
    );
    expect(replacement).toEqual(
      '(language:kuery,query:\'(user.name: "becky" or user.name: "evan")\')'
    );
  });

  test('replaces three comma separated values using an or clause', () => {
    const replacement = replaceKqlCommasWithOr(
      '(query:\'user.name : "becky,evan,braden"\',language:kuery)'
    );
    expect(replacement).toEqual(
      '(language:kuery,query:\'(user.name: "becky" or user.name: "evan" or user.name: "braden")\')'
    );
  });

  test('replaces three comma separated values using an or clause with an additional "and" clause next to it', () => {
    const replacement = replaceKqlCommasWithOr(
      '(query:\'user.name : "becky,evan,braden" and process.name:"process-name"\',language:kuery)'
    );
    expect(replacement).toEqual(
      '(language:kuery,query:\'(user.name: "becky" or user.name: "evan" or user.name: "braden") and process.name:"process-name"\')'
    );
  });

  test('replaces three comma separated values using an or clause with an additional "and" clause in front of it', () => {
    const replacement = replaceKqlCommasWithOr(
      '(query:\'process.name:"process-name" and user.name : "becky,evan,braden"\',language:kuery)'
    );
    expect(replacement).toEqual(
      '(language:kuery,query:\'process.name:"process-name" and (user.name: "becky" or user.name: "evan" or user.name: "braden")\')'
    );
  });

  test('replaces three comma separated values using an or clause with an additional "and" clause in front and behind it', () => {
    const replacement = replaceKqlCommasWithOr(
      '(query:\'process.name:"process-name" and user.name : "becky,evan,braden" and host.name:"host-name-1"\',language:kuery)'
    );
    expect(replacement).toEqual(
      '(language:kuery,query:\'process.name:"process-name" and (user.name: "becky" or user.name: "evan" or user.name: "braden") and host.name:"host-name-1"\')'
    );
  });

  test('empty string should return an empty string', () => {
    const replacement = replaceKqlCommasWithOr('');
    expect(replacement).toEqual('');
  });

  test('should not replace a single empty string value', () => {
    const replacement = replaceKqlCommasWithOr('(query:\'process.name : ""\',language:kuery)');
    expect(replacement).toEqual('(language:kuery,query:\'process.name : ""\')');
  });

  test('should not replace a complex string when no variables are present and no commas are present', () => {
    const replacement = replaceKqlCommasWithOr(
      '(query:\'user.name : "user-1" and process.name : "process-1"\',language:kuery)'
    );
    expect(replacement).toEqual(
      '(language:kuery,query:\'user.name : "user-1" and process.name : "process-1"\')'
    );
  });
});
