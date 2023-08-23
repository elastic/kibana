/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { gql } from 'graphql-request';

export const getRunsFeed = gql`
  query getRunsFeed($cursor: String, $filters: [Filters!]!) {
    runFeed(cursor: $cursor, filters: $filters) {
      cursor
      hasMore
      runs {
        runId
        createdAt
        completion {
          ...RunSummaryCompletion
          __typename
        }
        meta {
          ...RunSummaryMeta
          __typename
        }
        progress {
          ...RunProgress
          __typename
        }
        __typename
      }
      __typename
    }
  }

  fragment RunSummaryCompletion on RunCompletion {
    completed
    inactivityTimeoutMs
    __typename
  }

  fragment RunSummaryMeta on RunMeta {
    ciBuildId
    projectId
    commit {
      sha
      branch
      remoteOrigin
      message
      authorEmail
      authorName
      __typename
    }
    __typename
  }

  fragment RunProgress on RunProgress {
    updatedAt
    groups {
      groupId
      instances {
        ...RunGroupProgressInstances
        __typename
      }
      tests {
        ...RunGroupProgressTests
        __typename
      }
      __typename
    }
    __typename
  }

  fragment RunGroupProgressInstances on RunGroupProgressInstances {
    overall
    claimed
    complete
    failures
    passes
    __typename
  }

  fragment RunGroupProgressTests on RunGroupProgressTests {
    overall
    passes
    failures
    pending
    skipped
    flaky
    __typename
  }
`;
