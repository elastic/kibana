/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useRouteMatch } from 'react-router-dom';

import { useLink } from '../../../../hooks';

export function usePackagePolicyEditorPageUrl(dataStreamId?: string) {
  const {
    params: { packagePolicyId, policyId },
  } = useRouteMatch<{ policyId: string; packagePolicyId: string }>();
  const { getHref } = useLink();

  const baseUrl =
    packagePolicyId && policyId
      ? getHref('edit_integration', {
          policyId,
          packagePolicyId,
        })
      : getHref('integration_policy_edit', {
          packagePolicyId,
        });

  return `${baseUrl}${dataStreamId ? `?datastreamId=${encodeURIComponent(dataStreamId)}` : ''}`;
}
