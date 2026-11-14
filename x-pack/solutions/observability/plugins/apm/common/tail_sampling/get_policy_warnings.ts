/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import {
  TAIL_SAMPLING_POLICY_TYPES_WITH_WARNING,
  TAIL_SAMPLING_WARNING_CODES,
} from '@kbn/apm-api-shared';
import type { TailSamplingPolicy, TailSamplingWarning } from '@kbn/apm-api-shared';

const SPAN_KIND_PATTERN = /\bkind\b|SPAN_KIND_(CLIENT|PRODUCER)/;

function getSubPolicies(policy: TailSamplingPolicy): TailSamplingPolicy[] {
  const block = policy[String(policy.type)] as Record<string, unknown> | undefined;
  const subPolicies =
    block?.and_sub_policy ?? block?.drop_sub_policy ?? block?.composite_sub_policy;
  if (Array.isArray(subPolicies)) {
    return subPolicies as TailSamplingPolicy[];
  }
  return block?.not_sub_policy ? [block.not_sub_policy as TailSamplingPolicy] : [];
}

function conditionsOnSpanKind(policy: TailSamplingPolicy): boolean {
  if (policy.type === 'ottl_condition') {
    const block = policy.ottl_condition as { span?: unknown[] } | undefined;
    return (block?.span ?? []).some(
      (condition) => typeof condition === 'string' && SPAN_KIND_PATTERN.test(condition)
    );
  }
  if (policy.type === 'string_attribute') {
    const key = (policy.string_attribute as { key?: unknown } | undefined)?.key;
    return key === 'span.kind' || key === 'kind';
  }
  return getSubPolicies(policy).some(conditionsOnSpanKind);
}

function hasPolicyTypeWithWarning(policy: TailSamplingPolicy): boolean {
  return (
    TAIL_SAMPLING_POLICY_TYPES_WITH_WARNING.has(String(policy.type)) ||
    getSubPolicies(policy).some(hasPolicyTypeWithWarning)
  );
}

/**
 * Non-blocking advice on a structurally valid policy set. Saving stays possible.
 */
export function getTailSamplingPolicyWarnings(
  policies: TailSamplingPolicy[]
): TailSamplingWarning[] {
  const warnings: TailSamplingWarning[] = [];

  policies.forEach((policy, policyIndex) => {
    // Only a top-level drop or not policy can drop spans by kind.
    if ((policy.type === 'drop' || policy.type === 'not') && conditionsOnSpanKind(policy)) {
      warnings.push({
        code: TAIL_SAMPLING_WARNING_CODES.EXIT_SPANS_DROPPED,
        policyIndex,
        policyName: policy.name,
        message: i18n.translate('xpack.apm.tailSampling.warnings.exitSpansDropped', {
          defaultMessage:
            'This policy drops traces based on span kind. Traces that hold client or producer spans lose them, and the service map loses the connections they carry.',
        }),
      });
    }

    if (hasPolicyTypeWithWarning(policy)) {
      warnings.push({
        code: TAIL_SAMPLING_WARNING_CODES.RATE_LIMIT_PER_REPLICA,
        policyIndex,
        policyName: policy.name,
        message: i18n.translate('xpack.apm.tailSampling.warnings.rateLimitPerReplica', {
          defaultMessage:
            'Rate limits apply to each collector replica. When the sampling service runs several replicas, more traces are kept than the configured rate.',
        }),
      });
    }
  });

  return warnings;
}
