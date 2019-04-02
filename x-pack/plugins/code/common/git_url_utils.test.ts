/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isValidGitUrl } from './git_url_utils';

test('Git url validation', () => {
  // An url ends with .git
  expect(isValidGitUrl('https://github.com/elastic/elasticsearch.git')).toBeTruthy();

  // An url ends without .git
  expect(isValidGitUrl('https://github.com/elastic/elasticsearch')).toBeTruthy();

  // An url with http://
  expect(isValidGitUrl('http://github.com/elastic/elasticsearch')).toBeTruthy();

  // An url with ssh://
  expect(isValidGitUrl('ssh://elastic@github.com/elastic/elasticsearch.git')).toBeTruthy();

  // An url with ssh:// and port
  expect(isValidGitUrl('ssh://elastic@github.com:9999/elastic/elasticsearch.git')).toBeTruthy();

  // An url with git://
  expect(isValidGitUrl('git://elastic@github.com/elastic/elasticsearch.git')).toBeTruthy();

  // An url with an invalid protocol
  expect(isValidGitUrl('file:///Users/elastic/elasticsearch')).toBeFalsy();

  // An url without protocol
  expect(isValidGitUrl('/Users/elastic/elasticsearch')).toBeFalsy();
  expect(isValidGitUrl('github.com/elastic/elasticsearch')).toBeTruthy();

  // An valid git url but without whitelisted host
  expect(isValidGitUrl('https://github.com/elastic/elasticsearch.git', ['gitlab.com'])).toBeFalsy();

  // An valid git url but without whitelisted protocol
  expect(isValidGitUrl('https://github.com/elastic/elasticsearch.git', [], ['ssh'])).toBeFalsy();

  // An valid git url with both whitelisted host and protocol
  expect(
    isValidGitUrl('https://github.com/elastic/elasticsearch.git', ['github.com'], ['https'])
  ).toBeTruthy();
});
