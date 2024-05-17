/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { useMemo } from 'react';
import { isArtifactByPolicy } from '../../../../../common/endpoint/service/artifacts';
import { useUserPrivileges } from '../../../../common/components/user_privileges';
import type { ArtifactFormComponentProps } from '../types';

export const useIsArtifactAllowedPerPolicyUsage = (
  item: Pick<ExceptionListItemSchema, 'tags'>,
  mode: ArtifactFormComponentProps['mode']
): boolean => {
  const endpointAuthz = useUserPrivileges().endpointPrivileges;

  return useMemo(() => {
    return mode === 'edit' && !endpointAuthz.canCreateArtifactsByPolicy && isArtifactByPolicy(item);
  }, [endpointAuthz.canCreateArtifactsByPolicy, item, mode]);
};
