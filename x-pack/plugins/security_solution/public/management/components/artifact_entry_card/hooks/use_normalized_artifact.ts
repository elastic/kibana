/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/naming-convention */

import { useMemo } from 'react';
import { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { AnyArtifact, ArtifactInfo } from '../types';
import { EffectScope, TrustedApp } from '../../../../../common/endpoint/types';
import { tagsToEffectScope } from '../../../../../common/endpoint/service/trusted_apps/mapping';

/**
 * Takes in any artifact and return back a new data structure used internally with by the card's components
 *
 * @param item
 */
export const useNormalizedArtifact = (item: AnyArtifact): ArtifactInfo => {
  return useMemo(() => {
    const {
      name,
      created_by,
      created_at,
      updated_at,
      updated_by,
      description = '',
      entries,
    } = item;
    return {
      name,
      created_by,
      created_at,
      updated_at,
      updated_by,
      description,
      entries: entries as unknown as ArtifactInfo['entries'],
      os: isTrustedApp(item) ? item.os : getOsFromExceptionItem(item),
      effectScope: isTrustedApp(item) ? item.effectScope : getEffectScopeFromExceptionItem(item),
    };
  }, [item]);
};

export const isTrustedApp = (item: AnyArtifact): item is TrustedApp => {
  return 'effectScope' in item;
};

const getOsFromExceptionItem = (item: ExceptionListItemSchema): string => {
  // FYI: Exceptions seem to allow for items to be assigned to more than one OS, unlike Event Filters and Trusted Apps
  return item.os_types.join(', ');
};

const getEffectScopeFromExceptionItem = (item: ExceptionListItemSchema): EffectScope => {
  return tagsToEffectScope(item.tags);
};
