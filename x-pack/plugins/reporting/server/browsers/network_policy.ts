/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as _ from 'lodash';
import { parse } from 'url';

interface NetworkPolicyRule {
  allow: boolean;
  protocol?: string;
  host?: string;
}

export interface NetworkPolicy {
  enabled: boolean;
  rules: NetworkPolicyRule[];
}

const isHostMatch = (actualHost: string, ruleHost: string) => {
  const hostParts = actualHost.split('.').reverse();
  const ruleParts = ruleHost.split('.').reverse();

  return _.every(ruleParts, (part, idx) => part === hostParts[idx]);
};

export const allowRequest = (url: string, rules: NetworkPolicyRule[]) => {
  const parsed = parse(url);

  if (!rules.length) {
    return true;
  }

  // Accumulator has three potential values here:
  // True => allow request, don't check other rules
  // False => reject request, don't check other rules
  // Undefined => Not yet known, proceed to next rule
  const allowed = rules.reduce((result: boolean | undefined, rule) => {
    if (typeof result === 'boolean') {
      return result;
    }

    const hostMatch = rule.host ? isHostMatch(parsed.host || '', rule.host) : true;

    const protocolMatch = rule.protocol ? parsed.protocol === rule.protocol : true;

    const isRuleMatch = hostMatch && protocolMatch;

    return isRuleMatch ? rule.allow : undefined;
  }, undefined);

  return typeof allowed !== 'undefined' ? allowed : false;
};
