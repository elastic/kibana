/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Immutable, NewPolicyData, PolicyData } from '../../types';

/**
 * Given a Policy Data (package policy) object, return back a new object with only the field
 * needed for an Update/Create API action
 * @param policy
 */
export const getPolicyDataForUpdate = (
  policy: PolicyData | Immutable<PolicyData>
): NewPolicyData | Immutable<NewPolicyData> => {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const { id, revision, created_by, created_at, updated_by, updated_at, ...newPolicy } = policy;

  // trim custom malware notification string
  return {
    ...newPolicy,
    inputs: (newPolicy as Immutable<NewPolicyData>).inputs.map((input) => ({
      ...input,
      config: input.config && {
        ...input.config,
        policy: {
          ...input.config.policy,
          value: {
            ...input.config.policy.value,
            windows: {
              ...input.config.policy.value.windows,
              popup: {
                ...input.config.policy.value.windows.popup,
                malware: {
                  ...input.config.policy.value.windows.popup.malware,
                  message: input.config.policy.value.windows.popup.malware.message.trim(),
                },
              },
            },
            mac: {
              ...input.config.policy.value.mac,
              popup: {
                ...input.config.policy.value.mac.popup,
                malware: {
                  ...input.config.policy.value.mac.popup.malware,
                  message: input.config.policy.value.mac.popup.malware.message.trim(),
                },
              },
            },
          },
        },
      },
    })),
  };
};
