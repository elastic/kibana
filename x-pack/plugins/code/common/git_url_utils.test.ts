/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { validateGitUrl } from './git_url_utils';

test('Git url validation', () => {
  // An url ends with .git
  expect(validateGitUrl('https://github.com/elastic/elasticsearch.git')).toBeTruthy();

  // An url ends without .git
  expect(validateGitUrl('https://github.com/elastic/elasticsearch')).toBeTruthy();

  // An url with http://
  expect(validateGitUrl('http://github.com/elastic/elasticsearch')).toBeTruthy();

  // An url with ssh://
  expect(validateGitUrl('ssh://elastic@github.com/elastic/elasticsearch.git')).toBeTruthy();

  // An url with ssh:// and port
  expect(validateGitUrl('ssh://elastic@github.com:9999/elastic/elasticsearch.git')).toBeTruthy();

  // An url with git://
  expect(validateGitUrl('git://elastic@github.com/elastic/elasticsearch.git')).toBeTruthy();

  // An url with an invalid protocol
  expect(() => {
    validateGitUrl('file:///Users/elastic/elasticsearch', [], ['ssh', 'https', 'git']);
  }).toThrow('Git url protocol is not whitelisted.');

  // An url without protocol
  expect(() => {
    validateGitUrl('/Users/elastic/elasticsearch', [], ['ssh', 'https', 'git']);
  }).toThrow('Git url protocol is not whitelisted.');
  expect(() => {
    validateGitUrl('github.com/elastic/elasticsearch', [], ['ssh', 'https', 'git']);
  }).toThrow('Git url protocol is not whitelisted.');

  // An valid git url but without whitelisted host
  expect(() => {
    validateGitUrl('https://github.com/elastic/elasticsearch.git', ['gitlab.com']);
  }).toThrow('Git url host is not whitelisted.');

  // An valid git url but without whitelisted protocol
  expect(() => {
    validateGitUrl('https://github.com/elastic/elasticsearch.git', [], ['ssh']);
  }).toThrow('Git url protocol is not whitelisted.');

  // An valid git url with both whitelisted host and protocol
  expect(
    validateGitUrl('https://github.com/elastic/elasticsearch.git', ['github.com'], ['https'])
  ).toBeTruthy();
});
