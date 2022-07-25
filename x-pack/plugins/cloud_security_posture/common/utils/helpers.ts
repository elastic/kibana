/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CSP_RULE_SAVED_OBJECT_TYPE } from '../constants';

/**
 * @example
 * declare const foo: Array<string | undefined | null>
 * foo.filter(isNonNullable) // foo is Array<string>
 */
export const isNonNullable = <T extends unknown>(v: T): v is NonNullable<T> =>
  v !== null && v !== undefined;

export const extractErrorMessage = (e: unknown, defaultMessage = 'Unknown Error'): string => {
  if (e instanceof Error) return e.message;
  if (typeof e === 'string') return e;

  return defaultMessage; // TODO: i18n
};

export const createCspRuleSearchFilterByPackagePolicy = ({
  packagePolicyId,
  policyId,
}: {
  packagePolicyId: string;
  policyId?: string;
}): string =>
  `${CSP_RULE_SAVED_OBJECT_TYPE}.attributes.package_policy_id: "${packagePolicyId}"${
    policyId ? ` AND ${CSP_RULE_SAVED_OBJECT_TYPE}.attributes.policy_id: "${policyId}"` : ''
  }`;
