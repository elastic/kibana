/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import type { TailSamplingDiagnostic } from '@kbn/apm-api-shared';
import { getPolicySchema, isSupportedPolicyType } from './policy_schema';

function validatePolicy(policy: unknown, policyIndex: number): TailSamplingDiagnostic[] {
  if (typeof policy !== 'object' || policy === null || Array.isArray(policy)) {
    return [
      {
        code: 'invalid_policy',
        policyIndex,
        message: i18n.translate('xpack.apm.tailSampling.diagnostics.invalidPolicy', {
          defaultMessage: 'Each policy must be an object with a name and a type.',
        }),
      },
    ];
  }

  const { type } = policy as { type?: unknown };

  if (!isSupportedPolicyType(type)) {
    return [
      {
        code: 'unknown_policy_type',
        policyIndex,
        path: ['type'],
        message: i18n.translate('xpack.apm.tailSampling.diagnostics.unknownPolicyType', {
          defaultMessage: 'Unknown policy type {type}.',
          values: { type: JSON.stringify(type ?? null) },
        }),
      },
    ];
  }

  const result = getPolicySchema(type).safeParse(policy);
  if (result.success) {
    return [];
  }

  return result.error.issues.map((issue) => ({
    code: 'invalid_field',
    policyIndex,
    path: issue.path.map((segment) => (typeof segment === 'number' ? segment : String(segment))),
    message: issue.message,
  }));
}

/**
 * Blocking checks on a policy set. Returns the errors only. Warnings come from
 * `getTailSamplingPolicyWarnings` and never make a set invalid.
 */
export function validateTailSamplingPolicies(policies: unknown[]): TailSamplingDiagnostic[] {
  if (policies.length === 0) {
    return [
      {
        code: 'no_policies',
        message: i18n.translate('xpack.apm.tailSampling.diagnostics.noPolicies', {
          defaultMessage:
            'Add at least one policy. To stop tail-based sampling, disable it instead.',
        }),
      },
    ];
  }

  const diagnostics = policies.flatMap((policy, index) => validatePolicy(policy, index));

  const seen = new Set<string>();
  policies.forEach((policy, index) => {
    const name = (policy as { name?: unknown } | null)?.name;
    if (typeof name !== 'string' || !name.trim()) {
      return;
    }
    if (seen.has(name)) {
      diagnostics.push({
        code: 'duplicate_name',
        policyIndex: index,
        policyName: name,
        path: ['name'],
        message: i18n.translate('xpack.apm.tailSampling.diagnostics.duplicateName', {
          defaultMessage: 'Policy name {name} is already used. Names must be unique.',
          values: { name },
        }),
      });
    } else {
      seen.add(name);
    }
  });

  return diagnostics;
}
