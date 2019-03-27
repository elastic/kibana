/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RepositoryUtils } from './repository_utils';

test('Repository url parsing', () => {
  // Valid git url without .git suffix.
  const repo1 = RepositoryUtils.buildRepository('https://github.com/apache/sqoop');
  expect(repo1).toEqual({
    uri: 'github.com/apache/sqoop',
    url: 'https://github.com/apache/sqoop',
    name: 'sqoop',
    org: 'apache',
  });

  // Valid git url with .git suffix.
  const repo2 = RepositoryUtils.buildRepository('https://github.com/apache/sqoop.git');
  expect(repo2).toEqual({
    uri: 'github.com/apache/sqoop',
    url: 'https://github.com/apache/sqoop.git',
    name: 'sqoop',
    org: 'apache',
  });

  // An invalid git url
  const repo3 = RepositoryUtils.buildRepository('github.com/apache/sqoop');
  expect(repo3).toMatchObject({
    uri: 'github.com/apache/sqoop',
    url: 'http://github.com/apache/sqoop',
  });

  const repo4 = RepositoryUtils.buildRepository('git://a/b');
  expect(repo4).toEqual({
    uri: 'a/_/b',
    url: 'git://a/b',
    name: 'b',
    org: '_',
  });

  const repo5 = RepositoryUtils.buildRepository('git://a/b/c');
  expect(repo5).toEqual({
    uri: 'a/b/c',
    url: 'git://a/b/c',
    name: 'c',
    org: 'b',
  });
});

test('Repository url parsing with non standard segments', () => {
  const repo1 = RepositoryUtils.buildRepository('git://a/b/c/d');
  expect(repo1).toEqual({
    uri: 'a/b_c/d',
    url: 'git://a/b/c/d',
    name: 'd',
    org: 'b_c',
  });

  const repo2 = RepositoryUtils.buildRepository('git://a/b/c/d/e');
  expect(repo2).toEqual({
    uri: 'a/b_c_d/e',
    url: 'git://a/b/c/d/e',
    name: 'e',
    org: 'b_c_d',
  });

  const repo3 = RepositoryUtils.buildRepository('git://a');
  expect(repo3).toEqual({
    uri: 'a/_/_',
    url: 'git://a',
    name: '_',
    org: '_',
  });
});

test('Repository url parsing with port', () => {
  const repo1 = RepositoryUtils.buildRepository('ssh://mine@mydomain.com:27017/gitolite-admin');
  expect(repo1).toEqual({
    uri: 'mydomain.com:27017/mine/gitolite-admin',
    url: 'ssh://mine@mydomain.com:27017/gitolite-admin',
    name: 'gitolite-admin',
    org: 'mine',
  });

  const repo2 = RepositoryUtils.buildRepository(
    'ssh://mine@mydomain.com:27017/elastic/gitolite-admin'
  );
  expect(repo2).toEqual({
    uri: 'mydomain.com:27017/elastic/gitolite-admin',
    url: 'ssh://mine@mydomain.com:27017/elastic/gitolite-admin',
    name: 'gitolite-admin',
    org: 'elastic',
  });
});

test('Normalize repository index name', () => {
  const indexName1 = RepositoryUtils.normalizeRepoUriToIndexName('github.com/elastic/Kibana');
  const indexName2 = RepositoryUtils.normalizeRepoUriToIndexName('github.com/elastic/kibana');

  expect(indexName1 === indexName2).toBeFalsy();
  expect(indexName1).toEqual('github.com-elastic-kibana-e2b881a9');
  expect(indexName2).toEqual('github.com-elastic-kibana-7bf00473');

  const indexName3 = RepositoryUtils.normalizeRepoUriToIndexName('github.com/elastic-kibana/code');
  const indexName4 = RepositoryUtils.normalizeRepoUriToIndexName('github.com/elastic/kibana-code');
  expect(indexName3 === indexName4).toBeFalsy();
});
