/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { SECURITY_FEATURE_ID } from '../../../../../common/constants';
import type { Privilege } from '../../../containers/detection_engine/alerts/types';
import { useUserData } from '../../user_info';
import { useUserPrivileges } from '../../../../common/components/user_privileges';

const REQUIRED_INDEX_PRIVILIGES = ['read', 'write', 'view_index_metadata', 'maintenance'] as const;

const getIndexName = (indexPrivileges: Privilege['index']) => {
  const [indexName] = Object.keys(indexPrivileges);

  return indexName;
};

const getMissingIndexPrivileges = (
  indexPrivileges: Privilege['index']
): MissingIndexPrivileges | undefined => {
  const indexName = getIndexName(indexPrivileges);
  const privileges = indexPrivileges[indexName];
  const missingPrivileges = REQUIRED_INDEX_PRIVILIGES.filter((privelege) => !privileges[privelege]);

  if (missingPrivileges.length) {
    return [indexName, missingPrivileges];
  }
};

export type MissingFeaturePrivileges = [feature: string, privileges: string[]];
export type MissingIndexPrivileges = [indexName: string, privileges: string[]];

export interface MissingPrivileges {
  featurePrivileges: MissingFeaturePrivileges[];
  indexPrivileges: MissingIndexPrivileges[];
}

export const useMissingPrivileges = (): MissingPrivileges => {
  const { detectionEnginePrivileges, listPrivileges } = useUserPrivileges();
  const [{ canUserCRUD }] = useUserData();

  return useMemo<MissingPrivileges>(() => {
    const featurePrivileges: MissingFeaturePrivileges[] = [];
    const indexPrivileges: MissingIndexPrivileges[] = [];

    if (
      canUserCRUD == null ||
      listPrivileges.result == null ||
      detectionEnginePrivileges.result == null
    ) {
      /**
       * Do not check privileges till we get all the data. That helps to reduce
       * subsequent layout shift while loading and skip unneeded re-renders.
       */
      return {
        featurePrivileges,
        indexPrivileges,
      };
    }

    if (canUserCRUD === false) {
      featurePrivileges.push([SECURITY_FEATURE_ID, ['all']]);
    }

    const missingItemsPrivileges = getMissingIndexPrivileges(listPrivileges.result.listItems.index);
    if (missingItemsPrivileges) {
      indexPrivileges.push(missingItemsPrivileges);
    }

    const missingListsPrivileges = getMissingIndexPrivileges(listPrivileges.result.lists.index);
    if (missingListsPrivileges) {
      indexPrivileges.push(missingListsPrivileges);
    }

    const missingDetectionPrivileges = getMissingIndexPrivileges(
      detectionEnginePrivileges.result.index
    );
    if (missingDetectionPrivileges) {
      indexPrivileges.push(missingDetectionPrivileges);
    }

    return {
      featurePrivileges,
      indexPrivileges,
    };
  }, [canUserCRUD, listPrivileges, detectionEnginePrivileges]);
};
