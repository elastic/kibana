/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateSandboxAllowlist } from '@kbn/nightshift-investigations-plugin/common';
import {
  CUSTOMER0_CUSTOM_CONTEXT,
  ORCA_CUSTOM_CONTEXT,
  RETROSPECTIVE_GUARDRAIL_CONTEXT,
} from './custom_context';
import { EVAL_SANDBOX_EGRESS_ALLOWLIST } from './space_setup';

const GITHUB_REPO_PATTERN = /github\.com\/([\w.-]+\/[\w.-]+)/g;

const getReferencedGithubRepos = (contexts: readonly string[]): string[] => [
  ...new Set(
    contexts.flatMap((context) =>
      [...context.matchAll(GITHUB_REPO_PATTERN)].map(([, repo]) => repo.replace(/\.+$/, ''))
    )
  ),
];

describe('EVAL_SANDBOX_EGRESS_ALLOWLIST', () => {
  it('passes the sandbox allowlist validation unchanged', () => {
    expect(validateSandboxAllowlist([...EVAL_SANDBOX_EGRESS_ALLOWLIST])).toEqual({
      hosts: [...EVAL_SANDBOX_EGRESS_ALLOWLIST],
      errors: [],
    });
  });

  it('allows a git clone of every GitHub repository the eval custom context names', () => {
    const repos = getReferencedGithubRepos([
      ...CUSTOMER0_CUSTOM_CONTEXT,
      ...ORCA_CUSTOM_CONTEXT,
      RETROSPECTIVE_GUARDRAIL_CONTEXT,
    ]);

    // Guards against the pattern silently matching nothing after a context rewrite.
    expect(repos.length).toBeGreaterThan(0);
    for (const repo of repos) {
      expect(EVAL_SANDBOX_EGRESS_ALLOWLIST).toContain(`allow https github.com GET,POST /${repo}/`);
      expect(EVAL_SANDBOX_EGRESS_ALLOWLIST).toContain(
        `allow https github.com GET,POST /${repo}.git/`
      );
    }
  });
});
