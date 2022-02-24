/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { ArtifactFormComponentProps } from '../types';
import { useUserPrivileges } from '../../../../common/components/user_privileges';
import { isArtifactByPolicy } from '../../../../../common/endpoint/service/artifacts';

export const useIsArtifactAllowedPerPolicyUsage = (
  item: Pick<ExceptionListItemSchema, 'tags'>,
  mode: ArtifactFormComponentProps['mode']
): boolean => {
  const endpointAuthz = useUserPrivileges().endpointPrivileges;

  return useMemo(() => {
    return mode === 'edit' && !endpointAuthz.canCreateArtifactsByPolicy && isArtifactByPolicy(item);
  }, [endpointAuthz.canCreateArtifactsByPolicy, item, mode]);
};
