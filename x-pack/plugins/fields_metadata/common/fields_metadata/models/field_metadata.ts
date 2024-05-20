/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pick from 'lodash/pick';
import { FieldAttribute, FieldMetadataPlain } from '../types';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface FieldMetadata extends FieldMetadataPlain {}
export class FieldMetadata {
  private constructor(fieldMetadata: FieldMetadataPlain) {
    Object.assign(this, fieldMetadata);
  }

  public pick(props: FieldAttribute[]) {
    return pick(this, props);
  }

  public toPlain() {
    return Object.assign({}, this);
  }

  public static create(fieldMetadata: FieldMetadataPlain) {
    const fieldMetadataProps = {
      ...fieldMetadata,
      dashed_name: fieldMetadata.dashed_name ?? FieldMetadata.toDashedName(fieldMetadata.flat_name),
      normalize: fieldMetadata.normalize ?? [],
      short: fieldMetadata.short ?? fieldMetadata.description,
    };

    return new FieldMetadata(fieldMetadataProps);
  }

  private static toDashedName(flatName: string) {
    return flatName.split('.').join('-');
  }
}
