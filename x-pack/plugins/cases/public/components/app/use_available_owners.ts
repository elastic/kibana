/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APP_ID, FEATURE_ID } from '../../../common/constants';
import { useKibana } from '../../common/lib/kibana';
import { CasesPermissions } from '../../containers/types';

type Capability = Omit<keyof CasesPermissions, 'all'>;

/**
 *
 * @param capabilities : specifies the requirements for a valid owner, an owner will be included if it has the specified
 *  capabilities
 **/

export const useAvailableCasesOwners = (
  capabilities: Capability[] = ['create', 'read', 'update', 'delete', 'push']
): string[] => {
  const { capabilities: kibanaCapabilities } = useKibana().services.application;

  return Object.entries(kibanaCapabilities).reduce(
    (availableOwners: string[], [featureId, kibananCapability]) => {
      if (!featureId.endsWith('Cases')) {
        return availableOwners;
      }
      for (const cap of capabilities) {
        const hasCapability = !!kibananCapability[`${cap}_cases`];
        if (!hasCapability) {
          return availableOwners;
        }
      }
      availableOwners.push(getOwnerFromFeatureID(featureId));
      return availableOwners;
    },
    []
  );
};

const getOwnerFromFeatureID = (featureID: string) => {
  if (featureID === FEATURE_ID) {
    return APP_ID;
  }

  return featureID.replace('Cases', '');
};
