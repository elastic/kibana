/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { AnyArtifact, ArtifactInfo } from '../types';
import { EffectScope, MaybeImmutable } from '../../../../../common/endpoint/types';
import { tagsToEffectScope } from '../../../../../common/endpoint/service/trusted_apps/mapping';
import { isTrustedApp } from './is_trusted_app';

export const mapToArtifactInfo = (_item: MaybeImmutable<AnyArtifact>): ArtifactInfo => {
  const item = _item as AnyArtifact;

  // eslint-disable-next-line @typescript-eslint/naming-convention
  const { name, created_by, created_at, updated_at, updated_by, description = '', entries } = item;

  return {
    name,
    created_by,
    created_at,
    updated_at,
    updated_by,
    description,
    comments: isTrustedApp(item) ? [] : item.comments,
    entries: entries as unknown as ArtifactInfo['entries'],
    os: isTrustedApp(item) ? [item.os] : item.os_types ?? [],
    effectScope: isTrustedApp(item) ? item.effectScope : getEffectScopeFromExceptionItem(item),
  };
};

const getEffectScopeFromExceptionItem = (item: ExceptionListItemSchema): EffectScope => {
  return tagsToEffectScope(item.tags);
};
