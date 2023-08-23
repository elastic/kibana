/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { gql } from 'graphql-request';

export const getRun = gql`
  query getRun($runId: ID!) {
    run(id: $runId) {
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
      specs {
        ...RunDetailSpec
        __typename
      }
      progress {
        ...RunProgress
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

  fragment RunDetailSpec on RunSpec {
    instanceId
    spec
    claimedAt
    machineId
    groupId
    results {
      error
      flaky
      stats {
        ...AllInstanceStats
        __typename
      }
      __typename
    }
    __typename
  }

  fragment AllInstanceStats on InstanceStats {
    suites
    tests
    pending
    passes
    failures
    skipped
    suites
    wallClockDuration
    wallClockStartedAt
    wallClockEndedAt
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
