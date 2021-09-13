/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { EffectScope, TrustedApp } from '../../../../common/endpoint/types';

export type AnyArtifact = ExceptionListItemSchema | TrustedApp;

/**
 * A normalized structured that is used internally through out the card's components.
 */
export interface ArtifactInfo
  extends Pick<
    ExceptionListItemSchema,
    'name' | 'created_at' | 'updated_at' | 'created_by' | 'updated_by' | 'description'
  > {
  effectScope: EffectScope;
  os: string;
  entries: Array<{
    field: string;
    type: string;
    operator: string;
    value: string;
  }>;
}
