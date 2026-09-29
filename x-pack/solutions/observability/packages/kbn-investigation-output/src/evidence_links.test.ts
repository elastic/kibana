/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildCodeReferenceUrl,
  buildEvidenceDiscoverParams,
  formatCodeReferenceDetail,
  formatCodeReferenceLabel,
} from './evidence_links';

describe('buildEvidenceDiscoverParams', () => {
  const timeRange = { from: '2026-07-28T13:30:00Z', to: '2026-07-28T15:00:00Z' };

  it('builds ES|QL params from a query and its window', () => {
    expect(
      buildEvidenceDiscoverParams({
        description: 'Pool utilization saturates at 14:02.',
        esql_query: 'FROM metrics-* | STATS max = MAX(pool.utilization)',
        time_range: timeRange,
      })
    ).toEqual({
      query: { esql: 'FROM metrics-* | STATS max = MAX(pool.utilization)' },
      timeRange: { from: '2026-07-28T13:30:00Z', to: '2026-07-28T15:00:00Z' },
      interval: 'auto',
    });
  });

  it('returns undefined when the query has no time range, so the reader is never sent to an unbounded window', () => {
    expect(
      buildEvidenceDiscoverParams({
        description: 'Pool utilization saturates at 14:02.',
        esql_query: 'FROM metrics-* | STATS max = MAX(pool.utilization)',
      })
    ).toBeUndefined();
  });

  it('returns undefined when there is no query to open', () => {
    expect(
      buildEvidenceDiscoverParams({
        description: 'All checkout pods were in CrashLoopBackOff.',
        time_range: timeRange,
      })
    ).toBeUndefined();
  });

  it.each([
    ['datemath', { from: 'now-1h', to: 'now' }],
    ['a malformed bound', { from: 'yesterday afternoon', to: '2026-07-28T15:00:00Z' }],
    ['a reversed range', { from: '2026-07-28T15:00:00Z', to: '2026-07-28T13:30:00Z' }],
    ['an empty range', { from: '2026-07-28T15:00:00Z', to: '2026-07-28T15:00:00Z' }],
  ])('returns undefined for %s, which would frame the wrong window', (_label, window) => {
    expect(
      buildEvidenceDiscoverParams({
        description: 'Pool utilization saturates at 14:02.',
        esql_query: 'FROM metrics-* | STATS max = MAX(pool.utilization)',
        time_range: window,
      })
    ).toBeUndefined();
  });
});

describe('buildCodeReferenceUrl', () => {
  const githubCode = {
    source: 'github_connector' as const,
    repo: 'elastic/otel-demo-scenario',
    path: 'src/recommendationservice/recommendation_server.py',
    host: 'github.com',
    ref: 'f07c1da942b0c555fab6cf4eab612df1997b1329',
  };

  it('builds a commit-pinned blob URL', () => {
    expect(buildCodeReferenceUrl(githubCode)).toBe(
      'https://github.com/elastic/otel-demo-scenario/blob/f07c1da942b0c555fab6cf4eab612df1997b1329/src/recommendationservice/recommendation_server.py'
    );
  });

  it('accepts an abbreviated SHA, which pins just as firmly', () => {
    expect(buildCodeReferenceUrl({ ...githubCode, ref: 'f07c1da' })).toBe(
      'https://github.com/elastic/otel-demo-scenario/blob/f07c1da/src/recommendationservice/recommendation_server.py'
    );
  });

  it('returns undefined without a ref, so a link cannot drift onto changed code', () => {
    const { ref, ...withoutRef } = githubCode;

    expect(buildCodeReferenceUrl(withoutRef)).toBeUndefined();
  });

  it('returns undefined without a host, since a repo name alone does not identify a forge', () => {
    const { host, ...withoutHost } = githubCode;

    expect(buildCodeReferenceUrl(withoutHost)).toBeUndefined();
  });

  it("links a GitHub Enterprise host, which shares GitHub's blob path shape", () => {
    expect(buildCodeReferenceUrl({ ...githubCode, host: 'github.acme.com' })).toBe(
      'https://github.acme.com/elastic/otel-demo-scenario/blob/f07c1da942b0c555fab6cf4eab612df1997b1329/src/recommendationservice/recommendation_server.py'
    );
  });

  it('does not link a code_search reference even when it has a host and a ref', () => {
    expect(
      buildCodeReferenceUrl({
        source: 'code_search',
        repo: 'open-telemetry/opentelemetry-demo',
        path: 'src/recommendationservice/recommendation_server.py',
        host: 'github.com',
        ref: 'f07c1da942b0c555fab6cf4eab612df1997b1329',
      })
    ).toBeUndefined();
  });

  it('does not link a code_search reference that carries no host at all', () => {
    expect(
      buildCodeReferenceUrl({
        source: 'code_search',
        repo: 'open-telemetry/opentelemetry-demo',
        path: 'src/recommendationservice/recommendation_server.py',
      })
    ).toBeUndefined();
  });

  it('encodes segments so values cannot alter the URL structure', () => {
    expect(
      buildCodeReferenceUrl({
        ...githubCode,
        path: 'src/some dir/file?name.py',
        ref: 'feature/branch name',
      })
    ).toBe(
      'https://github.com/elastic/otel-demo-scenario/blob/feature%2Fbranch%20name/src/some%20dir/file%3Fname.py'
    );
  });

  it('refuses a path with dot segments, which the browser would resolve onto another repository', () => {
    expect(
      buildCodeReferenceUrl({
        ...githubCode,
        path: '../../../../evil-org/evil-repo/blob/main/x.ts',
      })
    ).toBeUndefined();
  });

  it('refuses a repo with dot segments', () => {
    expect(buildCodeReferenceUrl({ ...githubCode, repo: 'elastic/..' })).toBeUndefined();
  });

  it('links a host that carries a port', () => {
    expect(buildCodeReferenceUrl({ ...githubCode, host: 'github.acme.com:8443' })).toBe(
      'https://github.acme.com:8443/elastic/otel-demo-scenario/blob/f07c1da942b0c555fab6cf4eab612df1997b1329/src/recommendationservice/recommendation_server.py'
    );
  });

  it.each([
    ['a scheme', 'https://evil.example.com'],
    ['a path', 'github.com/evil'],
    ['credentials', 'user@evil.example.com'],
  ])('refuses a host containing %s', (_label, host) => {
    expect(buildCodeReferenceUrl({ ...githubCode, host })).toBeUndefined();
  });

  it('keeps an injected origin inside the path rather than letting it become the host', () => {
    expect(buildCodeReferenceUrl({ ...githubCode, repo: 'evil.example.com/x' })).toMatch(
      /^https:\/\/github\.com\//
    );
  });
});

describe('formatCodeReferenceLabel', () => {
  it('shows just the file name', () => {
    expect(
      formatCodeReferenceLabel({
        source: 'github_connector',
        repo: 'elastic/otel-demo-scenario',
        path: 'src/recommendationservice/recommendation_server.py',
      })
    ).toBe('recommendation_server.py');
  });
});

describe('formatCodeReferenceDetail', () => {
  const base = {
    source: 'github_connector' as const,
    repo: 'elastic/otel-demo-scenario',
    path: 'src/db/pool.ts',
  };

  it('shortens a commit SHA', () => {
    expect(
      formatCodeReferenceDetail({ ...base, ref: 'f07c1da942b0c555fab6cf4eab612df1997b1329' })
    ).toBe('elastic/otel-demo-scenario/src/db/pool.ts @ f07c1da');
  });

  it('shows a branch name verbatim, so an unpinned reference looks unpinned', () => {
    expect(formatCodeReferenceDetail({ ...base, ref: 'main' })).toBe(
      'elastic/otel-demo-scenario/src/db/pool.ts @ main'
    );
  });

  it('does not truncate a hex-looking branch name into something resembling a SHA', () => {
    expect(formatCodeReferenceDetail({ ...base, ref: 'deadbeef' })).toBe(
      'elastic/otel-demo-scenario/src/db/pool.ts @ deadbeef'
    );
  });

  it('shows an abbreviated SHA whole, since it is already short', () => {
    expect(formatCodeReferenceDetail({ ...base, ref: 'f07c1da942b0' })).toBe(
      'elastic/otel-demo-scenario/src/db/pool.ts @ f07c1da942b0'
    );
  });

  it('omits the revision when there is none', () => {
    expect(formatCodeReferenceDetail(base)).toBe('elastic/otel-demo-scenario/src/db/pool.ts');
  });

  it('leads with the host, so the reader sees the destination before clicking', () => {
    expect(formatCodeReferenceDetail({ ...base, host: 'github.acme.com', ref: 'main' })).toBe(
      'github.acme.com/elastic/otel-demo-scenario/src/db/pool.ts @ main'
    );
  });
});
