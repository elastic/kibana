/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export function getMaxPackageName(
  packageName: string,
  packagePolicies?: Array<{ name: string }>,
  prefix: string = ''
) {
  // Retrieve highest number appended to package policy name and increment it by one
  const pkgPoliciesNamePattern = new RegExp(`${prefix}${packageName}-(\\d+)`);

  const maxPkgPolicyName = Math.max(
    ...(packagePolicies ?? [])
      .filter((ds) => Boolean(ds.name.match(pkgPoliciesNamePattern)))
      .map((ds) => parseInt(ds.name.match(pkgPoliciesNamePattern)![1], 10)),
    0
  );

  return `${prefix}${packageName}-${maxPkgPolicyName + 1}`;
}
